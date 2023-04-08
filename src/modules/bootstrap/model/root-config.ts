import {
  ContractConfigFile,
  ContractMap,
} from '@modules/contract/model/contract-config';

export interface RootConfigFile {
  contract: ContractConfigFile;
}

export interface RootConfig {
  contractMap: ContractMap;
}
