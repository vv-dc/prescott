import { generateRandomString } from '@lib/random.utils';
import { EnvBuilderContract } from '@modules/contract/model/env/env-builder.contract';
import {
  ContractInitOpts,
  ContractModule,
} from '@modules/contract/model/contract';

export let envBuilderOpts = {} as Record<string, string | undefined>;

/* eslint-disable @typescript-eslint/no-unused-vars */
const envBuilder: EnvBuilderContract = {
  init: async (opts: ContractInitOpts) => {
    envBuilderOpts = { ...opts.contract, ...opts.system };
  },
  buildEnv: async (dto) => ({ envKey: generateRandomString(), script: null }),
  deleteEnv: async (dto) => {},
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => envBuilder,
} satisfies ContractModule;
