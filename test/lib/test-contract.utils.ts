import {
  Contract,
  ContractModule,
  ContractOpts,
  ContractSystemOpts,
} from '@modules/contract/model/contract';
import { config, PRESCOTT_CONFIG } from '@config/config';
import { buildContractSystemOpts } from '@modules/contract/contract-loader';

export const prepareContactSystemOpts = (): Promise<ContractSystemOpts> => {
  return buildContractSystemOpts(config[PRESCOTT_CONFIG].workDir ?? __dirname);
};

export const prepareContract = async <T extends Contract>(
  module: ContractModule,
  opts?: ContractOpts
): Promise<T> => {
  const systemOpts = await prepareContactSystemOpts();
  const contract = await module.buildContract();
  await contract.init({ system: systemOpts, contract: opts ?? {} });
  return contract as T;
};
