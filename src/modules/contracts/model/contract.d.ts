import { ContractType } from '@modules/contracts/model/contract-config';

export type ContractOpts = object;

export interface Contract {
  init: (opts?: ContractOpts) => Promise<void>;
}

export type ContractMap = Record<ContractType, Contract>;
