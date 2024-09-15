import { ConfigProviderContract } from '@modules/contract/model/config/config.contract';
import { generateRandomString } from '@lib/random.utils';

/* eslint-disable @typescript-eslint/no-unused-vars */
const configProvider: ConfigProviderContract = {
  init: async (opts) => {},
  resolveValue: (value: string) => generateRandomString(),
  resolveValueNullable: (value: string) => generateRandomString(),
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => configProvider,
};
