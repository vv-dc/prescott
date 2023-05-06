import * as Joi from 'joi';
import { TaskQueueContract } from '@modules/contract/model/task-queue.contract';

export const taskQueueSchema = Joi.object<TaskQueueContract>({
  init: Joi.function().minArity(1).required(),
  enqueue: Joi.function().minArity(2).required(),
});
