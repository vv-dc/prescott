import {
  Contract,
  ContractModule,
  ContractOpts,
  ContractSystemOpts,
} from '@modules/contract/model/contract';
import { config, PRESCOTT_CONFIG } from '@config/config';
import { buildContractSystemOpts } from '@modules/contract/contract-loader';
import { ConfigResolverContract } from '@src/modules/contract/model/config/config.contract';
import { generateRandomString } from '@src/lib/random.utils';
import { EnvRunnerContract } from '@src/modules/contract/model/env/env-runner.contract';
import { EnvBuilderContract } from '@src/modules/contract/model/env/env-builder.contract';
import { EnvHandle } from '@src/modules/contract/model/env/env-handle';

export const prepareContactSystemOpts = (): Promise<ContractSystemOpts> => {
  return buildContractSystemOpts(config[PRESCOTT_CONFIG].workDir ?? __dirname);
};

export const prepareContract = async <T extends Contract>(
  module: ContractModule,
  opts?: ContractOpts
): Promise<T> => {
  const systemOpts = await prepareContactSystemOpts();
  const contract = await module.buildContract();
  await contract.init({ system: systemOpts, contract: opts ?? {} });
  return contract as T;
};

export const mockContractImport = (
  key: string,
  contractImpl: Contract
): void => {
  const contractModule: ContractModule = {
    buildContract: async () => contractImpl,
  };
  jest.mock(key, () => ({ default: contractModule }), {
    virtual: true,
  });
};

export const prepareMockResolverContract = (
  variables: Partial<Record<string, string>> = {}
): ConfigResolverContract => {
  const resolveValueMock = jest.fn((value: string) => {
    return variables[value] ?? value;
  });
  const configResolver: ConfigResolverContract = {
    init: async () => {},
    resolveValue: resolveValueMock,
    resolveValueNullable: resolveValueMock,
  };
  return configResolver;
};

export const prepareMockEnvBuilderContract = (): EnvBuilderContract => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    init: jest.fn(async (opts) => {}),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    buildEnv: async (dto) => ({
      envKey: generateRandomString(),
      script: null,
    }),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    deleteEnv: async (dto) => {},
  };
};

export const prepareMockEnvRunnerContract = (): EnvRunnerContract => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    init: jest.fn(async (opts) => {}),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    runEnv: async (dto) => ({} as EnvHandle),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getEnvHandle: async (handleId) => ({} as EnvHandle),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getEnvChildrenHandleIds: async (label) => [],
  };
};
