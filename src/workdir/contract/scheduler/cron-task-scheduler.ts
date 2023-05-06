import { schedule, ScheduledTask } from 'node-cron';
import {
  ScheduleTaskDto,
  TaskSchedulerContract,
} from '@modules/contract/model/task-scheduler.contract';
import { ContractOpts } from '@modules/contract/model/contract';

const config = { workDir: '' };
const tasks: Record<string, ScheduledTask> = {};

const init = async (opts: ContractOpts) => {
  config.workDir = opts.workDir;
};

const scheduleTask = async (
  taskId: number,
  config: ScheduleTaskDto
): Promise<void> => {
  const { configString, callback } = config;
  tasks[taskId] = schedule(configString, callback, { scheduled: false });
};

const stop = async (taskId: number): Promise<void> => {
  const task = tasks[taskId];
  if (task !== undefined) {
    task.stop();
  }
};

const deleteTask = async (taskId: number): Promise<void> => {
  const task = tasks[taskId];
  if (task !== undefined) {
    task.stop();
    delete tasks[taskId];
  }
};

const start = async (taskId: number): Promise<void> => {
  const task = tasks[taskId];
  if (task !== undefined) {
    task.start();
  }
};

const exists = async (taskId: number): Promise<boolean> => {
  return Object.prototype.hasOwnProperty.call(tasks, taskId);
};

const taskScheduler: TaskSchedulerContract = {
  init,
  schedule: scheduleTask,
  stop,
  delete: deleteTask,
  start,
  exists,
};

export default {
  buildContract: () => taskScheduler,
};
