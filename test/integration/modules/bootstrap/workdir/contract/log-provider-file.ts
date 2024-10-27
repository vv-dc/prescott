import { LogProviderContract } from '@modules/contract/model/log/log-provider.contract';
import { ContractModule } from '@modules/contract/model/contract';

export let logProviderOpts = {} as Record<string, string | undefined>;

/* eslint-disable @typescript-eslint/no-unused-vars */
const logProviderFile: LogProviderContract = {
  init: async (opts) => {
    logProviderOpts = { ...opts.contract, ...opts.system };
  },
  consumeLogGenerator: async (id, generator) => {},
  searchLog: async (id, paging, dto) => ({
    next: 42,
    entries: [],
  }),
  flushLog: async (id) => {},
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => logProviderFile,
} satisfies ContractModule;
