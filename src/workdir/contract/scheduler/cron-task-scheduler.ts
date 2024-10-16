import { schedule, ScheduledTask } from 'node-cron';
import {
  ScheduleTaskDto,
  TaskSchedulerContract,
} from '@modules/contract/model/scheduler/task-scheduler.contract';
import {
  ContractInitOpts,
  ContractModule,
} from '@modules/contract/model/contract';

const config = { workDir: '' };
const tasks: Record<string, ScheduledTask> = {};

const init = async (opts: ContractInitOpts) => {
  config.workDir = opts.system.workDir;
};

const scheduleTask = async (
  taskId: number,
  config: ScheduleTaskDto
): Promise<void> => {
  const { scheduleConfig, callback } = config;
  tasks[taskId] = schedule(scheduleConfig, callback, { scheduled: false });
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
  buildContract: async () => taskScheduler,
} satisfies ContractModule;
