import * as Joi from 'joi';
import { ConfigResolverContract } from '@modules/contract/model/config/config.contract';

export const configResolverSchema = Joi.object<ConfigResolverContract>({
  init: Joi.function().minArity(1).required(),
  resolveValue: Joi.function().minArity(1).required(),
  resolveValueNullable: Joi.function().minArity(1).required(),
}).options({ allowUnknown: true });
