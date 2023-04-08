import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { buildContractMap } from '@modules/contract/contract-loader';
import { validateRootConfigFile } from '@modules/bootstrap/config-validator';
import {
  RootConfig,
  RootConfigFile,
} from '@modules/bootstrap/model/root-config';

export const getRootConfig = async (workDir: string): Promise<RootConfig> => {
  const configPath = buildRootConfigPath(workDir);
  const configFile = await loadRootConfigFile(configPath);
  const contractPath = buildContractDirPath(workDir);
  return await parseRootConfigFile(configFile, contractPath);
};

const buildRootConfigPath = (workDir: string): string =>
  path.join(workDir, 'config.json');

const buildContractDirPath = (workDir: string): string =>
  path.join(workDir, 'contract');

const loadRootConfigFile = async (path: string): Promise<RootConfigFile> => {
  const rawContent = await fs.readFile(path, 'utf-8');
  const configFile: RootConfigFile = JSON.parse(rawContent);

  const validationError = validateRootConfigFile(configFile);
  if (validationError !== null) {
    throw new Error(validationError);
  }

  return configFile;
};

const parseRootConfigFile = async (
  configFile: RootConfigFile,
  workDir: string
): Promise<RootConfig> => {
  const { contract } = configFile;
  return {
    contractMap: await buildContractMap(contract, workDir),
  };
};
