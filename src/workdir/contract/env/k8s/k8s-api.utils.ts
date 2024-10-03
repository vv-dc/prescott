import { randomInt } from 'node:crypto';
import * as k8s from '@kubernetes/client-node';

import { errorToReason } from '@modules/errors/get-error-reason';
import { Limitations } from '@model/domain/limitations';

const DEFAULT_NAMESPACE = 'default';

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
  return currentContext?.namespace ?? DEFAULT_NAMESPACE;
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
      throw err;
    }
    const reason = errorToReason(err);
    throw new Error(`K8s-runner: ${reason}`);
  }
};

export const buildK8sPodNamePrefix = () =>
  `prescott-${randomInt(1, 1_000_000)}`; // TODO: fixme

export const buildK8sPodLimits = (
  limitations: Limitations
): Record<string, string> => {
  const podLimitations: Record<string, string> = {};
  if (limitations.cpus) {
    podLimitations.cpu = limitations.cpus.toString();
  }
  if (limitations.ram) {
    podLimitations.memory = limitations.ram;
  }
  return podLimitations;
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
