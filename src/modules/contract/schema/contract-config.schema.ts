import * as Joi from 'joi';
import {
  CONTRACT_CONFIG_SOURCE_TYPES,
  ContractConfigFile,
  ContractConfigFileEntry,
  EnvBuilderContractConfigFileEntry,
  EnvRunnerContractConfigFileEntry,
} from '@modules/contract/model/contract-config';
import { ContractOpts } from '@modules/contract/model/contract';

export const contractConfigOptsSchema = Joi.object<ContractOpts>().pattern(
  /.*/,
  Joi.string()
); // any keys, but only string values

export const contractConfigEntrySchema = Joi.object<ContractConfigFileEntry>({
  type: Joi.string()
    .valid(...CONTRACT_CONFIG_SOURCE_TYPES)
    .required(),
  key: Joi.string().required(),
  opts: contractConfigOptsSchema.optional(),
});

export const envBuilderContractConfigEntrySchema =
  Joi.array<EnvBuilderContractConfigFileEntry>().items(
    contractConfigEntrySchema.append({
      name: Joi.string().required(),
    })
  );

export const envRunnerContractConfigEntrySchema =
  Joi.array<EnvRunnerContractConfigFileEntry>().items(
    contractConfigEntrySchema.append({
      name: Joi.string().required(),
      builder: Joi.string().required(),
    })
  );

export const contractConfigSchema = Joi.object<ContractConfigFile>({
  config: contractConfigEntrySchema.required(),
  envBuilder: envBuilderContractConfigEntrySchema.required(),
  envRunner: envRunnerContractConfigEntrySchema.required(),
  log: contractConfigEntrySchema.required(),
  metric: contractConfigEntrySchema.required(),
  scheduler: contractConfigEntrySchema.required(),
  queue: contractConfigEntrySchema.required(),
});
