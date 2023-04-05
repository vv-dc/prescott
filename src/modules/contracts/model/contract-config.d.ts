import { ContractOpts } from '@modules/contracts/model/contract';

export type ContractConfig = Record<ContractType, ContractConfigEntry>;

export const CONTRACT_CONFIG_TYPES = ['env', 'log', 'metric'] as const;
export type ContractType = (typeof CONTRACT_CONFIG_TYPES)[number];

export interface ContractConfigEntry {
  type: ContractSourceType;
  key: string;
  opts?: ContractOpts;
}

export type ContractSourceType = 'http' | 'file' | 'npm';
