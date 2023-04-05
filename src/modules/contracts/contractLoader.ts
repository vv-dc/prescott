import * as path from 'node:path';
import {
  assertConfigIncludesAllTypes,
  validContractImpl,
} from '@modules/contracts/contractValidator';
import {
  ContractConfig,
  ContractConfigEntry,
  CONTRACT_CONFIG_TYPES,
  ContractSourceType,
} from '@modules/contracts/model/contract-config';
import { ContractMap, Contract } from '@modules/contracts/model/contract';

export const buildContractMap = async (
  config: ContractConfig
): Promise<ContractMap> => {
  const contractMap = {} as ContractMap;
  assertConfigIncludesAllTypes(config);

  for (const type of CONTRACT_CONFIG_TYPES) {
    const entry = config[type];
    const impl = await buildContract(entry);

    const error: string | null = await validContractImpl(type, impl);
    if (error !== null) {
      throw new Error(`Invalid implementation for ${type}: ${error}`);
    }

    contractMap[type] = impl;
  }

  return contractMap;
};

const buildContract = async (
  configEntry: ContractConfigEntry
): Promise<Contract> => {
  const { type, key, opts } = configEntry;
  try {
    const contract = await loadContract(type, key);
    await contract.init(opts);
    return contract;
  } catch (err) {
    const reason = (err as Error).message;
    throw new Error(
      `Unable to build contract for ${JSON.stringify(configEntry)}: ${reason}`
    );
  }
};

const loadContract = async (
  type: ContractSourceType,
  key: string
): Promise<Contract> => {
  switch (type) {
    case 'npm':
      return loadNpmContract(key);
    case 'file':
      return loadFileContract(key);
  }
  const reason = `unsupported type of contract source: ${type}`;
  throw new Error(`Unable to load contract: ${reason}`);
};

const loadNpmContract = async (key: string): Promise<Contract> => {
  const module = await import(key);
  return module.default;
};

const loadFileContract = async (key: string): Promise<Contract> => {
  const ext = path.extname(key);
  if (!['.js'].includes(ext)) {
    const reason = `unsupported extension: ${ext}`;
    throw new Error(`Unable to load contract from file: ${reason}`);
  }
  const module = await import(key);
  return module.default;
};
