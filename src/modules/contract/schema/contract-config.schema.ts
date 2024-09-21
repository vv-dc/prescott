import * as Joi from 'joi';
import {
  CONTRACT_CONFIG_SOURCE_TYPES,
  ContractConfigFile,
  ContractConfigFileEntry,
} from '@modules/contract/model/contract-config';

export const contractConfigEntrySchema = Joi.object<ContractConfigFileEntry>({
  type: Joi.string()
    .valid(...CONTRACT_CONFIG_SOURCE_TYPES)
    .required(),
  key: Joi.string().required(),
  opts: Joi.object().optional(),
});

export const contractConfigSchema = Joi.object<ContractConfigFile>({
  config: contractConfigEntrySchema.required(),
  envBuilder: contractConfigEntrySchema.required(),
  envRunner: contractConfigEntrySchema.required(),
  log: contractConfigEntrySchema.required(),
  metric: contractConfigEntrySchema.required(),
  scheduler: contractConfigEntrySchema.required(),
  queue: contractConfigEntrySchema.required(),
});
