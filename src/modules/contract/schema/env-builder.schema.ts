import * as Joi from 'joi';
import { EnvBuilderContract } from '@modules/contract/model/env/env-builder.contract';

export const envBuilderSchema = Joi.object<EnvBuilderContract>({
  init: Joi.function().minArity(1).required(),
  buildEnv: Joi.function().minArity(1).required(),
  deleteEnv: Joi.function().minArity(1).required(),
});
