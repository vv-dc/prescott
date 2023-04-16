import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { TaskDao } from '@plugins/task/task.dao';
import { TaskService } from '@plugins/task/task.service';
import { taskRoutes } from '@plugins/task/task.route';

const task: FastifyPluginAsync = async (fastify) => {
  const { pg, contractMap } = fastify;
  const { envProvider, logProvider, metricProvider } = contractMap;

  const taskDao = new TaskDao(pg);
  const taskService = new TaskService(
    taskDao,
    envProvider,
    logProvider,
    metricProvider
  );

  fastify.decorate('taskService', taskService);
  fastify.register(taskRoutes);
};

export default fp(task, {
  name: 'task',
  decorators: {
    fastify: ['pg', 'contractMap'],
  },
  dependencies: ['pg', 'docker', 'schema', 'authentication'],
});
