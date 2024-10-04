import * as k8s from '@kubernetes/client-node';

import { errorToReason } from '@modules/errors/get-error-reason';
import { Limitations } from '@model/domain/limitations';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';
import { millisecondsToSeconds } from '@lib/time.utils';
import { generateRandomString } from '@lib/random.utils';
import { PRESCOTT_POD_K8S_CONST } from '@src/workdir/contract/env/k8s/model/k8s-const';

export class K8sEnvRunnerError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(`K8s-env-runner: ${message}[${statusCode}]`);
  }
}

export const checkK8sApiHealth = async (
  apiClient: k8s.CoreV1Api,
  namespace: string
): Promise<void> => {
  await makeK8sApiRequest(() => apiClient.listNamespacedPod(namespace));
};

export const inferCurrentNamespaceByKubeConfig = (
  kubeConfig: k8s.KubeConfig
): string => {
  const currentContextName = kubeConfig.getCurrentContext();
  const allContexts = kubeConfig.getContexts();
  const currentContext = allContexts.find((c) => c.name === currentContextName);
  return currentContext?.namespace ?? 'default';
};

export const makeK8sApiRequest = async <T>(
  fn: () => Promise<T>,
  beforeThrowCallback?: () => Promise<void> | void
): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (beforeThrowCallback) {
      beforeThrowCallback();
    }
    if (err instanceof k8s.HttpError) {
      const { statusCode, body } = err;
      throw new K8sEnvRunnerError(body.message, statusCode ?? 500);
    }
    const reason = errorToReason(err);
    throw new K8sEnvRunnerError(reason, 500);
  }
};

export const generateK8sPodNameByLabel = (label: string): string =>
  generateRandomString(label);

export const getK8sPodLabelByName = (podName: string): string => {
  const lastSeparatorIdx = podName.lastIndexOf('-');
  return podName.slice(0, lastSeparatorIdx);
};

export const buildK8sPodCreateDto = (
  identifier: K8sPodIdentifier,
  imageKey: string,
  imagePullPolicy: string,
  limitations?: Limitations
): k8s.V1Pod => {
  const { namespace, label, name, runnerContainer } = identifier;
  const [resourceLimits, ttlSeconds] = buildK8sPodResourceLimits(limitations);

  const podSpec: k8s.V1PodSpec = {
    restartPolicy: 'Never',
    containers: [
      {
        name: runnerContainer,
        image: imageKey,
        imagePullPolicy,
        resources: { limits: resourceLimits },
      },
    ],
  };
  if (ttlSeconds !== undefined) {
    podSpec.activeDeadlineSeconds = ttlSeconds;
    podSpec.terminationGracePeriodSeconds = 0;
  }

  return {
    apiVersion: 'v1',
    metadata: {
      name,
      labels: {
        [PRESCOTT_POD_K8S_CONST.LABEL_ORIGIN_KEY]: label,
      },
      namespace,
    },
    spec: podSpec,
  };
};

const buildK8sPodResourceLimits = (
  limitations?: Limitations
): [Record<string, string>, number | undefined] => {
  if (!limitations) {
    return [{}, undefined];
  }

  const resourceLimitations: Record<string, string> = {};
  if (limitations.cpus) {
    resourceLimitations.cpu = limitations.cpus.toString();
  }
  if (limitations.ram) {
    resourceLimitations.memory = limitations.ram;
  }
  const ttlSeconds = limitations.ttl
    ? millisecondsToSeconds(limitations.ttl)
    : undefined;

  return [resourceLimitations, ttlSeconds];
};

export const inferAllWaitingContainersFailureReasonNullable = (
  containers: k8s.V1ContainerStatus[]
): string | null => {
  let composedFailureReason = '';

  for (const container of containers) {
    const reason = inferK8sWaitingContainerFailureReasonNullable(container);
    if (reason) {
      composedFailureReason += `[${container.name}]: ${reason}`;
    }
  }

  return composedFailureReason.length === 0 ? null : composedFailureReason;
};

const inferK8sWaitingContainerFailureReasonNullable = (
  container: k8s.V1ContainerStatus
): string | null => {
  if (!container.state || !container.state.waiting?.reason) {
    return null;
  }

  const IMAGE_RELATED_REASONS = [
    'ErrImagePull',
    'ErrImageNeverPull',
    'InvalidImageName',
  ];
  const { reason, message } = container.state.waiting;
  if (IMAGE_RELATED_REASONS.includes(reason)) {
    return formatK8sReasonMessage(reason, message);
  }

  return null;
};

export const inferK8sTerminatedPodReasonNullable = (
  status: k8s.V1PodStatus,
  runnerContainer: string
): string | null => {
  const { reason, message, containerStatuses } = status;

  if (reason) {
    return formatK8sReasonMessage(reason, message);
  }
  if (!containerStatuses || containerStatuses.length === 0) {
    return null;
  }

  const container = containerStatuses.find((c) => c.name === runnerContainer);
  if (!container?.state?.terminated?.reason) {
    return null;
  }

  const { reason: containerReason, message: containerMessage } =
    container.state.terminated;
  return formatK8sReasonMessage(containerReason, containerMessage);
};

const formatK8sReasonMessage = (reason: string, message?: string): string => {
  return message ? `${reason}: ${message}` : reason;
};

export const inferK8sPodExitCodeNullable = (
  containerStates: k8s.V1ContainerStatus[],
  containerName: string
): number | null => {
  const targetContainer = containerStates.find((c) => c.name === containerName);
  if (!targetContainer || !targetContainer.state?.terminated) {
    return null;
  }
  return targetContainer.state.terminated.exitCode;
};
