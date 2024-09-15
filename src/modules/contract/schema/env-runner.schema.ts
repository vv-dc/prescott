import * as Joi from 'joi';
import { EnvRunnerContract } from '@modules/contract/model/env/env-runner.contract';

export const envRunnerSchema = Joi.object<EnvRunnerContract>({
  init: Joi.function().minArity(1).required(),
  runEnv: Joi.function().minArity(1).required(),
  getEnvHandle: Joi.function().minArity(1).required(),
  getEnvChildrenHandleIds: Joi.function().minArity(1).required(),
});
