import { LogProviderContract } from '@modules/contract/model/log-provider.contract';

/* eslint-disable @typescript-eslint/no-unused-vars */
const logProvider: LogProviderContract = {
  init: async (opts) => {},
  consumeLogGenerator: async (id, generator) => {},
  searchLog: async (id, paging, dto) => ({
    next: 42,
    entries: [],
  }),
  flushLog: async (id) => {},
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => logProvider,
};
