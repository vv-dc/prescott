import {
  CompileEnvDto,
  DeleteEnvDto,
  EnvId,
  EnvProviderContract,
  RunEnvDto,
} from '@modules/contract/model/env-provider.contract';
import { EnvHandle } from '@modules/contract/model/env-handle';
import { generateRandomString } from '@lib/random.utils';
import { ContractOpts } from '@modules/contract/model/contract';

/* eslint-disable @typescript-eslint/no-unused-vars */
const init = async (opts: ContractOpts): Promise<void> => {
  // no-op
};

const runEnv = async (dto: RunEnvDto): Promise<EnvHandle> => {
  return {} as EnvHandle;
};

const compileEnv = async (dto: CompileEnvDto): Promise<string> => {
  return generateRandomString();
};

const deleteEnv = async (dto: DeleteEnvDto): Promise<void> => {
  // no-op
};

const getEnvChildren = async (envId: EnvId): Promise<string[]> => {
  return [];
};

const getEnvHandle = async (handleId: string): Promise<EnvHandle> => {
  return {} as EnvHandle;
};

const envProvider: EnvProviderContract = {
  init,
  runEnv,
  compileEnv,
  deleteEnv,
  getEnvChildren,
  getEnvHandle,
};

export default {
  buildContract: async () => envProvider,
};
