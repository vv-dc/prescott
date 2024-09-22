import {
  Contract,
  ContractModule,
  ContractOpts,
} from '@modules/contract/model/contract';
import { config, PRESCOTT_CONFIG } from '@config/config';
import { buildContractSystemOpts } from '@modules/contract/contract-loader';

export const prepareContract = async <T extends Contract>(
  module: ContractModule,
  opts?: ContractOpts
): Promise<T> => {
  const systemOpts = await buildContractSystemOpts(
    config[PRESCOTT_CONFIG].workDir ?? __dirname
  );
  const contract = await module.buildContract();
  await contract.init({ system: systemOpts, contract: opts ?? {} });
  return contract as T;
};
