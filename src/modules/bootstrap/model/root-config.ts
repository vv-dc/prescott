import {
  ContractConfigFile,
  ContractMap,
} from '@modules/contracts/model/contract-config';

export interface RootConfigFile {
  contract: ContractConfigFile;
}

export interface RootConfig {
  contractMap: ContractMap;
}
