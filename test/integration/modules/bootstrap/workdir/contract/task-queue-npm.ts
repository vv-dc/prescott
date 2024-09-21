import { TaskQueueContract } from '@modules/contract/model/queue/task-queue.contract';
import { ContractModule } from '@modules/contract/model/contract';

export let taskQueueOpts = {} as Record<string, string | undefined>;

/* eslint-disable @typescript-eslint/no-unused-vars */
const taskQueueNpm: TaskQueueContract = {
  init: async (opts) => {
    taskQueueOpts = { ...opts.contract, ...opts.system };
  },
  enqueue: async (taskId, fn) => {},
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => taskQueueNpm,
} satisfies ContractModule;
