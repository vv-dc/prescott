import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { TaskDao } from '@plugins/task/task.dao';
import { TaskService } from '@plugins/task/task.service';
import { taskRoutes } from '@plugins/task/task.route';
import { TaskRunDao } from '@plugins/task/task-run.dao';
import { TaskRunService } from '@plugins/task/task-run.service';
import { TaskExecutorService } from '@plugins/task/task-executor.service';

const task: FastifyPluginAsync = async (fastify) => {
  const { db, contractMap } = fastify;
  const { envBuilder, envRunner, log, metric, scheduler, queue } = contractMap;

  const taskExecutorService = new TaskExecutorService(
    envBuilder,
    envRunner,
    scheduler,
    queue
  );

  const taskRunDao = new TaskRunDao(db);
  const taskRunService = new TaskRunService(taskRunDao, log, metric);

  const taskDao = new TaskDao(db);
  const taskService = new TaskService(
    taskDao,
    taskExecutorService,
    taskRunService
  );

  fastify.decorate('taskService', taskService);
  fastify.decorate('taskRunService', taskRunService);
  fastify.register(taskRoutes);
};

export default fp(task, {
  name: 'task',
  decorators: {
    fastify: ['db', 'contractMap', 'authHooks'],
  },
  dependencies: ['db', 'schema', 'authentication', 'authorization'],
});
