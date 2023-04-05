import { Schema } from 'joi';
import {
  CONTRACT_CONFIG_TYPES,
  ContractConfig,
  ContractType,
} from '@modules/contracts/model/contract-config';
import { Contract } from '@modules/contracts/model/contract';
import { envProviderSchema } from '@modules/contracts/schema/env-provider.schema';
import { logProviderSchema } from '@modules/contracts/schema/log-provider.schema';
import { metricProviderSchema } from '@modules/contracts/schema/metric-provider.schema';

const contractSchema: Record<ContractType, Schema> = {
  env: envProviderSchema,
  log: logProviderSchema,
  metric: metricProviderSchema,
};

export const validContractImpl = async (
  type: ContractType,
  impl: Contract
): Promise<string | null> => {
  const schema = contractSchema[type];
  const { error } = await schema.validateAsync(impl);
  return error ? `Invalid implementation for ${type}: reason` : null;
};

export const assertConfigIncludesAllTypes = (config: ContractConfig): void => {
  for (const contractType of CONTRACT_CONFIG_TYPES) {
    if (!config[contractType]) {
      throw new Error(`No config found for ${contractType}`);
    }
  }
};
