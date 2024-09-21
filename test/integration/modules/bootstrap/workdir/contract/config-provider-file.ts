import { ConfigProviderContract } from '@modules/contract/model/config/config.contract';

export const PREDEFINED_VARIABLES_MAP: Record<string, string> = {
  '{{ENV_BUILDER_VAR}}': 'env-builder-42-var',
  '{{LOG_PROVIDER_VAR}}': 'lOg-Pr0v1der-var',
  '{{SCHEDULER_VAR}}': 'sCheDulEr_42',
};

const resolveValueImpl = (value: string): string => {
  const resolved = PREDEFINED_VARIABLES_MAP[value];
  return resolved ?? value;
};

/* eslint-disable @typescript-eslint/no-unused-vars */
const configProviderFile: ConfigProviderContract = {
  init: async (opts) => {},
  resolveValue: resolveValueImpl,
  resolveValueNullable: resolveValueImpl,
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => configProviderFile,
};
