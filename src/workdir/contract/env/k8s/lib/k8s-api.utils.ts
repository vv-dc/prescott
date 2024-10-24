import * as k8s from '@kubernetes/client-node';

import { errorToReason } from '@modules/errors/get-error-reason';
import { Limitations } from '@model/domain/limitations';
import { K8sPodIdentifier } from '@src/workdir/contract/env/k8s/model/k8s-pod-identifier';
import { millisecondsToSeconds } from '@lib/time.utils';
import { generateRandomString } from '@lib/random.utils';
import { PRESCOTT_K8S_POD_CONST } from '@src/workdir/contract/env/k8s/model/k8s-const';
import { parseJwtToken } from '@src/lib/jwt.utils';
import { K8sPodContainerConfig } from '../model/k8s-pod-config';

export class K8sEnvRunnerError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(`K8s-env-runner: ${message}[${statusCode}]`);
  }
}

interface K8sServiceAccountTokenPayload {
  'kubernetes.io'?: {
    serviceaccount: k8s.V1ServiceAccountSubject;
  };
}

interface K8sContainerTerminationDetails {
  exitCode: number;
  reason: string;
}

export const inferNamespaceByKubeConfig = (
  kubeConfig: k8s.KubeConfig
): string => {
  const currentContextName = kubeConfig.getCurrentContext();
  const allContexts = kubeConfig.getContexts();
  const currentContext = allContexts.find((c) => c.name === currentContextName);
  return currentContext?.namespace || PRESCOTT_K8S_POD_CONST.NAMESPACE;
};

export const inferServiceAccountByKubeConfig = (
  kubeConfig: k8s.KubeConfig
): string => {
  const DEFAULT_SERVICE_ACCOUNT = 'default';

  const user = kubeConfig.getCurrentUser();
  if (!user?.token) {
    return DEFAULT_SERVICE_ACCOUNT;
  }

  const payload = parseJwtToken<K8sServiceAccountTokenPayload>(user.token);
  return (
    payload['kubernetes.io']?.serviceaccount?.name || DEFAULT_SERVICE_ACCOUNT
  );
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
  containerConfig: K8sPodContainerConfig,
  imageKey: string,
  script: string | null,
  limitations: Limitations | null
): k8s.V1Pod => {
  const { namespace, label, name, runnerContainer } = identifier;
  const { pullPolicy, pullSecret } = containerConfig;

  const [resourceLimits, ttlSeconds] = buildK8sPodResourceLimits(limitations);
  const scriptSpec = script ? buildK8sContainerScriptSpec(script) : undefined;

  const podSpec: k8s.V1PodSpec = {
    restartPolicy: 'Never',
    containers: [
      {
        name: runnerContainer,
        image: imageKey,
        imagePullPolicy: pullPolicy,
        resources: { limits: resourceLimits },
        ...scriptSpec,
      },
    ],
  };

  if (pullSecret) {
    podSpec.imagePullSecrets = [{ name: pullSecret }];
  }
  if (ttlSeconds) {
    podSpec.activeDeadlineSeconds = ttlSeconds;
    podSpec.terminationGracePeriodSeconds = 0;
  }

  return {
    apiVersion: 'v1',
    metadata: {
      name,
      labels: {
        [PRESCOTT_K8S_POD_CONST.LABEL_ORIGIN_KEY]: label,
      },
      namespace,
    },
    spec: podSpec,
  };
};

const buildK8sContainerScriptSpec = (
  script: string
): Partial<k8s.V1Container> => {
  return {
    command: ['/bin/sh'],
    args: ['-c', script],
  };
};

const buildK8sPodResourceLimits = (
  limitations: Limitations | null
): [Record<string, string>, number | undefined] => {
  if (limitations === null) {
    return [{}, undefined];
  }

  const resourceLimitations: Record<string, string> = {};
  if (limitations.cpu) {
    resourceLimitations.cpu = limitations.cpu;
  }
  if (limitations.ram) {
    resourceLimitations.memory = limitations.ram;
  }
  const ttlSeconds = limitations.ttl
    ? millisecondsToSeconds(limitations.ttl)
    : undefined;

  return [resourceLimitations, ttlSeconds];
};

export const inferK8sWaitingPodTerminationDetailsNullable = (
  status: k8s.V1PodStatus,
  targetContainer: string
): K8sContainerTerminationDetails | null => {
  const container = getContainerFromStatusesNullable(
    status.containerStatuses ?? [],
    targetContainer
  );
  return container?.state?.waiting
    ? inferK8sWaitingContainerTerminationDetailsNullable(
        container.state.waiting
      )
    : null;
};

export const inferK8sTerminatedPodTerminationDetailsNullable = (
  status: k8s.V1PodStatus,
  targetContainer: string
): K8sContainerTerminationDetails | null => {
  const { reason, message, containerStatuses } = status;

  const container = getContainerFromStatusesNullable(
    containerStatuses ?? [],
    targetContainer
  );
  if (!container?.state?.terminated) {
    return null;
  }

  const podReason = reason
    ? formatK8sReasonMessage(reason, message)
    : undefined;
  return inferK8sTerminatedContainerTerminationDetails(
    container.state.terminated,
    podReason
  );
};

export const getContainerFromStatusesNullable = (
  containerStatuses: k8s.V1ContainerStatus[],
  targetContainer: string
): k8s.V1ContainerStatus | null => {
  if (containerStatuses.length === 0) {
    return null;
  }
  const container = containerStatuses.find((c) => c.name === targetContainer);
  return container ?? null;
};

const inferK8sTerminatedContainerTerminationDetails = (
  state: k8s.V1ContainerStateTerminated,
  podReason?: string
): K8sContainerTerminationDetails => {
  const { reason, message, exitCode } = state;
  const formattedReason = formatK8sReasonMessage(
    reason ?? 'Unknown',
    message ?? podReason,
    exitCode
  );
  return { reason: formattedReason, exitCode };
};

const inferK8sWaitingContainerTerminationDetailsNullable = (
  state: k8s.V1ContainerStateWaiting
): K8sContainerTerminationDetails | null => {
  if (!state.reason) {
    return null;
  }

  const { reason, message } = state;
  if (
    !PRESCOTT_K8S_POD_CONST.WAITING_CONTAINER_FAILURE_REASONS.includes(
      reason as never
    )
  ) {
    return null;
  }

  return {
    reason: formatK8sReasonMessage(reason, message),
    exitCode: PRESCOTT_K8S_POD_CONST.FAILURE_EXIT_CODE,
  };
};

const formatK8sReasonMessage = (
  reason: string,
  message?: string,
  exitCode?: number
): string => {
  if (message) {
    return `${reason}: ${message}`;
  }
  if (exitCode) {
    return `${reason}: code=${exitCode}`;
  }
  return reason;
};
