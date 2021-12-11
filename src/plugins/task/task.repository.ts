import { schedule, ScheduledTask } from 'node-cron';
import { TaskCronConfig } from '@plugins/task/model/task-cron-config';

type ScheduledTasksRepository = {
  [key: string]: ScheduledTask;
};

const tasks: ScheduledTasksRepository = {};

export const deleteTask = (name: string): void => {
  const task = tasks[name];
  task.stop();
  delete tasks[name];
};

export const addTask = (config: TaskCronConfig): ScheduledTask => {
  const { name, cronString, callback } = config;
  const task = schedule(cronString, callback);
  task.start();
  tasks[name] = task;
  return task;
};

export const stopTask = (name: string): void => {
  const task = tasks[name];
  task.stop();
};

export const getTasks = (): ScheduledTasksRepository => Object.freeze(tasks);
