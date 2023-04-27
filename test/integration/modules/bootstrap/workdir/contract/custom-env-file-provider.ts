import { EnvProviderContract } from '@modules/contract/model/env-provider.contract';
import { EnvHandle } from '@modules/contract/model/env-handle';
import { generateRandomString } from '@lib/random.utils';

export let envParam = 0;
export let envWorkDir = '';

/* eslint-disable @typescript-eslint/no-unused-vars */
const envProvider: EnvProviderContract = {
  init: async (opts) => {
    envParam = opts.envParam as number;
    envWorkDir = opts.workDir;
  },
  runEnv: async (dto) => ({} as EnvHandle),
  compileEnv: async (dto) => generateRandomString(),
  deleteEnv: async (dto) => {},
  getEnvChildren: async (envId) => [],
  getEnvHandle: async (handleId) => ({} as EnvHandle),
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => envProvider,
  getEnvParam: () => envParam,
};
