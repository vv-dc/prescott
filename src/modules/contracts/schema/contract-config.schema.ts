import * as Joi from 'joi';
import {
  CONTRACT_CONFIG_SOURCE_TYPES,
  ContractConfigFile,
  ContractConfigFileEntry,
} from '@modules/contracts/model/contract-config';

export const contractConfigEntrySchema = Joi.object<ContractConfigFileEntry>({
  type: Joi.string()
    .valid(...CONTRACT_CONFIG_SOURCE_TYPES)
    .required(),
  key: Joi.string().required(),
  opts: Joi.object().optional(),
});

export const contractConfigSchema = Joi.object<ContractConfigFile>({
  env: contractConfigEntrySchema,
  log: contractConfigEntrySchema,
  metric: contractConfigEntrySchema,
});
