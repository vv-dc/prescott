import { TaskSchedulerContract } from '@modules/contract/model/scheduler/task-scheduler.contract';
import { ContractModule } from '@modules/contract/model/contract';

export let taskSchedulerOpts = {} as Record<string, string | undefined>;

/* eslint-disable @typescript-eslint/no-unused-vars */
const taskSchedulerFile: TaskSchedulerContract = {
  init: async (opts) => {
    taskSchedulerOpts = { ...opts.contract, ...opts.system };
  },
  schedule: async (taskId, dto) => {},
  start: async (taskId) => {},
  stop: async (taskId) => {},
  delete: async (taskId) => {},
  exists: async (taskId) => Math.random() > 0.5,
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => taskSchedulerFile,
} satisfies ContractModule;
