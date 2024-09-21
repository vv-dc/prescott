import * as process from 'node:process';
import {
  ContractInitOpts,
  ContractModule,
} from '@modules/contract/model/contract';
import { ConfigResolverContract } from '@modules/contract/model/config/config.contract';

const IS_RESOLVABLE_REGEXP = /^\{\{.*\}\}$/;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const init = async (opts: ContractInitOpts): Promise<void> => {
  // no-op
};

const resolveValue = (value: string): string => {
  const result = resolveValueNullable(value);
  if (result === null) {
    throw new Error(`Cannot resolve value='${value}'`);
  }
  return result;
};

const resolveValueNullable = (value: string): string | null => {
  if (!isResolvable(value)) {
    return value;
  }
  return process.env[value.slice(2, -2)] ?? null;
};

const isResolvable = (value: string): boolean => {
  return IS_RESOLVABLE_REGEXP.test(value);
};

const configResolver: ConfigResolverContract = {
  init,
  resolveValue,
  resolveValueNullable,
};

export default {
  buildContract: async () => configResolver,
} satisfies ContractModule;
