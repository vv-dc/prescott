import { ConfigResolverContract } from '@modules/contract/model/config/config.contract';
import { ContractModule } from '@modules/contract/model/contract';

export const PREDEFINED_VARIABLES_MAP: Record<string, string> = {
  '{{ENV_BUILDER_VAR}}': 'env-builder-42-var',
  '{{LOG_PROVIDER_VAR}}': 'lOg-Pr0v1der-var',
  '{{SCHEDULER_VAR}}': 'sCheDulEr_42',
} as const;

const resolveValueImpl = (value: string): string => {
  const resolved = PREDEFINED_VARIABLES_MAP[value];
  return resolved ?? value;
};

export let configResolverOpts = {} as Record<string, string | undefined>;

/* eslint-disable @typescript-eslint/no-unused-vars */
const configResolverFile: ConfigResolverContract = {
  init: async (opts) => {
    configResolverOpts = { ...opts.contract, ...opts.system };
  },
  resolveValue: resolveValueImpl,
  resolveValueNullable: resolveValueImpl,
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => configResolverFile,
} satisfies ContractModule;
