import { schedule, ScheduledTask } from 'node-cron';
import { TaskCronConfig } from '@plugins/task/model/task-cron-config';

type ScheduledTasksRepository = {
  [taskId: string]: ScheduledTask;
};

const tasks: ScheduledTasksRepository = {};

export const deleteTask = (taskId: number): void => {
  const task = tasks[taskId];
  if (task !== undefined) {
    task.stop();
    delete tasks[taskId];
  } else throw new Error('Task does not exist');
};

export const addTask = (config: TaskCronConfig): ScheduledTask => {
  const { taskId, cronString, callback } = config;
  const task = schedule(cronString, callback);
  tasks[taskId] = task;
  return task;
};

export const stopTask = (taskId: number): void => {
  const task = tasks[taskId];
  if (task !== undefined) {
    task.stop();
  } else throw new Error('Task does not exist');
};

export const startTask = (taskId: number): void => {
  const task = tasks[taskId];
  if (task !== undefined) {
    task.start();
  }
};

export const existsTask = (taskId: number): boolean =>
  Object.prototype.hasOwnProperty.call(tasks, taskId);

// note: it's only for testing purposes
export const getScheduledTasks = (): ScheduledTasksRepository =>
  Object.assign({}, tasks);
