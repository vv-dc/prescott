import * as Joi from 'joi';
import { EnvProviderContract } from '@modules/contract/model/env-provider.contract';

export const envProviderSchema = Joi.object<EnvProviderContract>({
  init: Joi.function().minArity(1).required(),
  runEnv: Joi.function().minArity(1).required(),
  compileEnv: Joi.function().minArity(1).required(),
  deleteEnv: Joi.function().minArity(1).required(),
  deleteEnvHierarchical: Joi.function().minArity(1).required(),
});
