import { generateRandomString } from '@lib/random.utils';
import { EnvBuilderContract } from '@modules/contract/model/env/env-builder.contract';
import { ContractInitOpts } from '@modules/contract/model/contract';

export let envParam = '';
export let envWorkDir = '';

/* eslint-disable @typescript-eslint/no-unused-vars */
const envBuilder: EnvBuilderContract = {
  init: async (opts: ContractInitOpts) => {
    envParam = opts.contract.envParam ?? '';
    envWorkDir = opts.system.workDir;
  },
  buildEnv: async (dto) => generateRandomString(),
  deleteEnv: async (dto) => {},
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => envBuilder,
  getEnvParam: () => envParam,
};
