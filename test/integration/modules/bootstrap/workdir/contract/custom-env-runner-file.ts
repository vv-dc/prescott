import { EnvHandle } from '@modules/contract/model/env/env-handle';
import { EnvRunnerContract } from '@modules/contract/model/env/env-runner.contract';
import { ContractInitOpts } from '@modules/contract/model/contract';

export let envParam = '';
export let envWorkDir = '';

/* eslint-disable @typescript-eslint/no-unused-vars */
const envRunner: EnvRunnerContract = {
  init: async (opts: ContractInitOpts) => {
    envParam = opts.contract.envParam || '';
    envWorkDir = opts.system.workDir;
  },
  runEnv: async (dto) => ({} as EnvHandle),
  getEnvChildrenHandleIds: async (envId) => [],
  getEnvHandle: async (handleId) => ({} as EnvHandle),
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => envRunner,
  getEnvParam: () => envParam,
};
