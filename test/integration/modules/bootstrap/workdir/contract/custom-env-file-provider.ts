import { EnvProviderContract } from '@modules/contract/model/env-provider.contract';
import { EnvHandle } from '@modules/contract/model/env-handle';
import { generateRandomString } from '@lib/random.utils';
import { ContractOpts } from '@modules/contract/model/contract';

export let envParam = 0;

/* eslint-disable @typescript-eslint/no-unused-vars */
const envProvider: EnvProviderContract = {
  init: async (opts?) => {
    envParam = (opts as ContractOpts).envParam as number;
  },
  runEnv: async (dto) => ({} as EnvHandle),
  compileEnv: async (dto) => generateRandomString(),
  deleteEnv: async (dto) => {},
  deleteEnvHierarchical: async (dto) => {},
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => envProvider,
  getEnvParam: () => envParam,
};
