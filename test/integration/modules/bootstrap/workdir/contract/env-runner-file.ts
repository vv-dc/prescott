import { EnvHandle } from '@modules/contract/model/env/env-handle';
import { EnvRunnerContract } from '@modules/contract/model/env/env-runner.contract';
import {
  ContractInitOpts,
  ContractModule,
} from '@modules/contract/model/contract';

export let envRunnerOpts = {} as Record<string, string | undefined>;

/* eslint-disable @typescript-eslint/no-unused-vars */
const envRunner: EnvRunnerContract = {
  init: async (opts: ContractInitOpts) => {
    envRunnerOpts = { ...opts.contract, ...opts.system };
  },
  runEnv: async (dto) => ({} as EnvHandle),
  getEnvChildrenHandleIds: async (envId) => [],
  getEnvHandle: async (handleId) => ({} as EnvHandle),
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => envRunner,
} satisfies ContractModule;
