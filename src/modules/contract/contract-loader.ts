import * as path from 'node:path';
import {
  validateContractConfig,
  validateContractImpl,
} from '@modules/contract/contract-validator';
import {
  CONTRACT_TYPES,
  ContractConfigFile,
  ContractConfigFileEntry,
  ContractMap,
  ContractSourceType,
  ContractType,
  ResolvableContractType,
} from '@modules/contract/model/contract-config';
import {
  Contract,
  ContractModule,
  ContractOpts,
  ContractSystemOpts,
} from '@modules/contract/model/contract';
import { getLogger } from '@logger/logger';
import { ConfigResolverContract } from '@modules/contract/model/config/config.contract';

const logger = getLogger('contract-loader');

export const buildContractMap = async (
  contractConfig: ContractConfigFile,
  systemOpts: ContractSystemOpts
): Promise<ContractMap> => {
  const configError = validateContractConfig(contractConfig);
  if (configError !== null) {
    throw new Error(configError);
  }

  const configResolver = await buildConfigResolverContract(
    contractConfig['config'],
    systemOpts
  );
  const contractMap = { config: configResolver } as ContractMap;

  for (const type of CONTRACT_TYPES.slice(1)) {
    const entry = contractConfig[type];
    const impl = await buildResolvableContract(
      type as ResolvableContractType,
      entry,
      configResolver,
      systemOpts
    );
    contractMap[type] = impl as never; // validation passed in runtime, so type check is redundant
  }

  logger.info(`Loaded root config from workDir=${systemOpts.workDir}`);
  return contractMap;
};

export const loadAndValidateContract = async (
  contractType: ContractType,
  configEntry: ContractConfigFileEntry,
  systemOpts: ContractSystemOpts
): Promise<Contract> => {
  const { type, key } = configEntry;
  const contractImpl = await loadContract(type, key, systemOpts);

  // check signature in runtime
  const implValidationError = validateContractImpl(contractType, contractImpl);
  if (implValidationError !== null) {
    throw new Error(implValidationError);
  }

  return contractImpl;
};

export const buildConfigResolverContract = async (
  entry: ContractConfigFileEntry,
  systemOpts: ContractSystemOpts
): Promise<ConfigResolverContract> => {
  const impl = await loadAndValidateContract('config', entry, systemOpts);
  await impl.init({ contract: entry.opts ?? {}, system: systemOpts }); // no resolve for config-contract
  logger.debug(`Built "config" contract`);
  return impl as ConfigResolverContract;
};

export const buildResolvableContract = async (
  type: ResolvableContractType,
  entry: ContractConfigFileEntry,
  configResolver: ConfigResolverContract,
  systemOpts: ContractSystemOpts
): Promise<Contract> => {
  const impl = await loadAndValidateContract(type, entry, systemOpts);

  const resolvedOpts = entry.opts
    ? await resolveContractOpts(configResolver, entry.opts)
    : {};
  await impl.init({ contract: resolvedOpts, system: systemOpts });

  logger.debug(`Built "${type}" contract`);
  return impl;
};

export const loadContract = async (
  type: ContractSourceType,
  key: string,
  systemOpts: ContractSystemOpts
): Promise<Contract> => {
  switch (type) {
    case 'npm':
      return loadNpmContract(key);
    case 'file':
      return loadFileContract(path.join(systemOpts.workDir, 'contract'), key);
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

const resolveContractOpts = async (
  configResolver: ConfigResolverContract,
  opts: ContractOpts
): Promise<ContractOpts> => {
  const resolvedOpts: ContractOpts = {};

  for (const [key, value] of Object.entries(opts)) {
    if (value) {
      // TODO: add contract opts validation schema and then resolveNullable here - schema will handle types
      // TODO: also try to resolve from env
      resolvedOpts[key] = await configResolver.resolveValue(value);
    }
  }

  return resolvedOpts;
};
