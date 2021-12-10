import { schedule, ScheduledTask } from 'node-cron';
import { TaskCronConfig } from '@plugins/task/model/task-cron-config.model';

const tasks: {
  [key: string]: ScheduledTask;
} = {};

export const deleteTask = (name: string): void => {
  const task = tasks[name];
  task.stop();
  delete tasks[name];
};

export const addTask = (config: TaskCronConfig): ScheduledTask => {
  const { name, cronString, callback, once } = config;

  const wrappedCallback = once
    ? async () => {
        await callback();
        deleteTask(name);
      }
    : callback;

  const task = schedule(cronString, wrappedCallback);
  task.start();

  tasks[name] = task;
  return task;
};

export const updateTask = (
  name: string,
  config: TaskCronConfig
): ScheduledTask => {
  deleteTask(name);
  return addTask(config);
};
