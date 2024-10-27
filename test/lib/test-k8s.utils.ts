import * as fsp from 'node:fs/promises';

import { config, PRESCOTT_CONFIG } from '@config/config';
import { ContractOpts } from '@modules/contract/model/contract';

export const getK8sResourcePath = (subPath: string): string => {
  const workDir = config[PRESCOTT_CONFIG].workDir;
  return `${workDir}/data/k8s/${subPath}`;
};

// interface K8sApiConfig {
//   host: string;
//   token: string;
//   namespace?: string;
// }
export const getK8sApiConfig = async (): Promise<ContractOpts> => {
  const apiConfigPath = getK8sResourcePath('api.json');
  const apiConfigRaw = await fsp.readFile(apiConfigPath, 'utf-8');
  return JSON.parse(apiConfigRaw);
};
