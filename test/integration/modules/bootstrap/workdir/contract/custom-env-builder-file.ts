import { generateRandomString } from '@lib/random.utils';
import { EnvBuilderContract } from '@modules/contract/model/env/env-builder.contract';

export let envParam = 0;
export let envWorkDir = '';

/* eslint-disable @typescript-eslint/no-unused-vars */
const envBuilder: EnvBuilderContract = {
  init: async (opts) => {
    envParam = opts.envParam as number;
    envWorkDir = opts.workDir;
  },
  buildEnv: async (dto) => generateRandomString(),
  deleteEnv: async (dto) => {},
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => envBuilder,
  getEnvParam: () => envParam,
};
