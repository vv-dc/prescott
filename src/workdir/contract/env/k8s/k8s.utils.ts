import { randomInt } from 'node:crypto';
import * as k8s from '@kubernetes/client-node';

import { Limitations } from '@model/domain/limitations';

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

export const formatK8sReasonMessageByPodStatus = (
  status: k8s.V1PodStatus
): string => {
  return status.reason
    ? formatK8sReasonMessage(status.reason, status.message)
    : 'Unknown reason';
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
