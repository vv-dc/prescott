import { randomInt } from 'node:crypto';
import { Limitations } from '@model/domain/limitations';

export const buildK8sPodIdentifier = () =>
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
