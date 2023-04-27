import {
  ContractConfigFile,
  ContractMap,
} from '@modules/contract/model/contract-config';

export interface RootConfigFile {
  contract?: Partial<ContractConfigFile>;
}

export interface RootConfig {
  contractMap: ContractMap;
}
