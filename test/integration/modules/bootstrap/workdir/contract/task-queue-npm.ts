import { TaskQueueContract } from '@modules/contract/model/queue/task-queue.contract';

/* eslint-disable @typescript-eslint/no-unused-vars */
const taskQueueNpm: TaskQueueContract = {
  init: async (opts) => {},
  enqueue: async (taskId, fn) => {},
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => taskQueueNpm,
};
