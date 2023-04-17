import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { TaskDao } from '@plugins/task/task.dao';
import { TaskService } from '@plugins/task/task.service';
import { taskRoutes } from '@plugins/task/task.route';
import { EnvProviderContract } from '@modules/contract/model/env-provider.contract';
import { LogProviderContract } from '@modules/contract/model/log-provider.contract';
import { MetricProviderContract } from '@modules/contract/model/metric-provider.contract';

const task: FastifyPluginAsync = async (fastify) => {
  const { pg, contractMap } = fastify;
  const { env, log, metric } = contractMap;

  const taskDao = new TaskDao(pg);
  const taskService = new TaskService(
    taskDao,
    env as EnvProviderContract,
    log as LogProviderContract,
    metric as MetricProviderContract
  );

  fastify.decorate('taskService', taskService);
  fastify.register(taskRoutes);
};

export default fp(task, {
  name: 'task',
  decorators: {
    fastify: ['pg', 'contractMap'],
  },
  dependencies: ['pg', 'schema', 'authentication'],
});
