import * as path from 'node:path';
import {
  validateContactImpl,
  validateContractConfig,
} from '@modules/contracts/contract-validator';
import {
  CONTRACT_CONFIG_TYPES,
  ContractConfigFile,
  ContractConfigFileEntry,
  ContractMap,
  ContractSourceType,
} from '@modules/contracts/model/contract-config';
import { Contract, ContractModule } from '@modules/contracts/model/contract';

export const buildContractMap = async (
  config: ContractConfigFile,
  workDir: string
): Promise<ContractMap> => {
  const configError = validateContractConfig(config);
  if (configError !== null) {
    throw new Error(configError);
  }

  const contractMap = {} as ContractMap;
  for (const type of CONTRACT_CONFIG_TYPES) {
    const entry = config[type];
    const impl = await buildContract(entry, workDir);

    const entryError: string | null = validateContactImpl(type, impl);
    if (entryError !== null) {
      throw new Error(entryError);
    }

    contractMap[type] = impl;
  }

  return contractMap;
};

export const buildContract = async (
  configEntry: ContractConfigFileEntry,
  workDir: string
): Promise<Contract> => {
  const { type, key, opts } = configEntry;
  try {
    const contract = await loadContract(type, key, workDir);
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
  key: string,
  workDir: string
): Promise<Contract> => {
  switch (type) {
    case 'npm':
      return loadNpmContract(key);
    case 'file':
      return loadFileContract(path.join(workDir, key));
  }
  const reason = `unsupported type of contract source: ${type}`;
  throw new Error(`Unable to load contract: ${reason}`);
};

const loadNpmContract = async (key: string): Promise<Contract> => {
  return await importContractModule(key);
};

const importContractModule = async (path: string): Promise<Contract> => {
  const module = await import(path);
  const moduleContent: ContractModule = module.default ?? module;
  return moduleContent.buildContract();
};

const loadFileContract = async (key: string): Promise<Contract> => {
  const { ext, dir, name } = path.parse(key);
  if (!['.js', '.ts'].includes(ext)) {
    const reason = `unsupported extension: ${ext}`;
    throw new Error(`Unable to load contract from file: ${reason}`);
  }
  const moduleKey = path.join(dir, name);
  return await importContractModule(moduleKey);
};
