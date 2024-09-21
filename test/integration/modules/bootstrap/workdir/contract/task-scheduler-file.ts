import { TaskSchedulerContract } from '@modules/contract/model/scheduler/task-scheduler.contract';

/* eslint-disable @typescript-eslint/no-unused-vars */
const taskSchedulerFile: TaskSchedulerContract = {
  init: async (opts) => {},
  schedule: async (taskId, dto) => {},
  start: async (taskId) => {},
  stop: async (taskId) => {},
  delete: async (taskId) => {},
  exists: async (taskId) => Math.random() > 0.5,
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export default {
  buildContract: async () => taskSchedulerFile,
};
