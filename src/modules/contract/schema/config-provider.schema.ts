import * as Joi from 'joi';
import { ConfigProviderContract } from '@modules/contract/model/config/config.contract';

export const configProviderSchema = Joi.object<ConfigProviderContract>({
  init: Joi.function().minArity(1).required(),
  resolveValue: Joi.function().minArity(1).required(),
  resolveValueNullable: Joi.function().minArity(1).required(),
});
