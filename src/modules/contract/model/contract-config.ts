import { Contract, ContractOpts } from '@modules/contract/model/contract';

export type ContractConfigFile = Record<ContractType, ContractConfigFileEntry>;

export const CONTRACT_CONFIG_TYPES = ['env', 'log', 'metric'] as const;
export type ContractType = (typeof CONTRACT_CONFIG_TYPES)[number];

export interface ContractConfigFileEntry {
  type: ContractSourceType;
  key: string;
  opts?: ContractOpts;
}

export const CONTRACT_CONFIG_SOURCE_TYPES = ['file', 'npm'] as const;
export type ContractSourceType = (typeof CONTRACT_CONFIG_SOURCE_TYPES)[number];

export type ContractMap = Record<ContractType, Contract>;
