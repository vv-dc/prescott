import { EnvHandle } from '@modules/contract/model/env/env-handle';
import { EnvRunnerContract } from '@modules/contract/model/env/env-runner.contract';

export let envParam = 0;
export let envWorkDir = '';

/* eslint-disable @typescript-eslint/no-unused-vars */
const envRunner: EnvRunnerContract = {
  init: async (opts) => {
    envParam = opts.envParam as number;
    envWorkDir = opts.workDir;
  },
  runEnv: async (dto) => ({} as EnvHandle),
  getEnvChildren: async (envId) => [],
  getEnvHandle: async (handleId) => ({} as EnvHandle),
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => envRunner,
  getEnvParam: () => envParam,
};
