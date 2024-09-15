import * as path from 'node:path';
import {
  validateContactImpl,
  validateContractConfig,
} from '@modules/contract/contract-validator';
import {
  CONTRACT_CONFIG_TYPES,
  ContractConfigFile,
  ContractConfigFileEntry,
  ContractMap,
  ContractSourceType,
} from '@modules/contract/model/contract-config';
import {
  Contract,
  ContractModule,
  ContractSystemOpts,
} from '@modules/contract/model/contract';
import { getLogger } from '@logger/logger';
import { errorToReason } from '@modules/errors/get-error-reason';

const logger = getLogger('config-loader');

export const buildContractMap = async (
  config: ContractConfigFile,
  workDir: string
): Promise<ContractMap> => {
  const configError = validateContractConfig(config);
  if (configError !== null) {
    throw new Error(configError);
  }

  const systemOpts = await buildContractSystemOpts(workDir);
  const contractMap = {} as ContractMap;

  for (const type of CONTRACT_CONFIG_TYPES) {
    const entry = config[type];
    const impl = await buildContract(entry, systemOpts);

    const entryError: string | null = validateContactImpl(type, impl);
    if (entryError !== null) {
      throw new Error(entryError);
    }

    contractMap[type] = impl;
  }

  logger.info(`Loaded root config from workDir=${workDir}`);
  return contractMap;
};

export const buildContract = async (
  configEntry: ContractConfigFileEntry,
  systemOpts: ContractSystemOpts
): Promise<Contract> => {
  const { type, key, opts } = configEntry;
  try {
    const contractWorkdir = path.join(systemOpts.workDir, 'contract');
    const contract = await loadContract(type, key, contractWorkdir);
    await contract.init({ contract: opts ?? {}, system: systemOpts });
    return contract;
  } catch (err) {
    const reason = errorToReason(err);
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
      return loadFileContract(workDir, key);
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

const loadFileContract = async (
  workDir: string,
  key: string
): Promise<Contract> => {
  const keyPath = path.normalize(path.join(workDir, key));

  const relativePath = path.relative(workDir, keyPath);
  if (relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    const reason = `contract should be located within: ${workDir} directory`;
    throw new Error(`Unable to load contact from file: ${reason}`);
  }

  const { ext, dir, name } = path.parse(keyPath);
  if (!['.js', '.ts'].includes(ext)) {
    const reason = `unsupported extension: ${ext}`;
    throw new Error(`Unable to load contract from file: ${reason}`);
  }
  const moduleKey = path.join(dir, name);
  return await importContractModule(moduleKey);
};

export const buildContractSystemOpts = async (
  workDir: string
): Promise<ContractSystemOpts> => {
  return {
    workDir,
  };
};
