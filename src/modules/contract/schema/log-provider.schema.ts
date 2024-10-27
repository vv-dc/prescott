import * as Joi from 'joi';
import { LogProviderContract } from '@modules/contract/model/log/log-provider.contract';

export const logProviderSchema = Joi.object<LogProviderContract>({
  init: Joi.function().minArity(1).required(),
  consumeLogGenerator: Joi.function().minArity(2).required(),
  searchLog: Joi.function().minArity(3).required(),
  flushLog: Joi.function().minArity(1).required(),
}).options({ allowUnknown: true });
