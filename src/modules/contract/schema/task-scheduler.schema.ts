import * as Joi from 'joi';
import { TaskSchedulerContract } from '@modules/contract/model/task-scheduler.contract';

export const taskSchedulerSchema = Joi.object<TaskSchedulerContract>({
  init: Joi.function().minArity(1).required(),
  schedule: Joi.function().minArity(2).required(),
  start: Joi.function().minArity(1).required(),
  stop: Joi.function().minArity(1).required(),
  delete: Joi.function().minArity(1).required(),
  exists: Joi.function().minArity(1).required(),
});
