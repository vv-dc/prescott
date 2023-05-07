import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { TaskDao } from '@plugins/task/task.dao';
import { TaskService } from '@plugins/task/task.service';
import { taskRoutes } from '@plugins/task/task.route';
import { EnvProviderContract } from '@modules/contract/model/env-provider.contract';
import { LogProviderContract } from '@modules/contract/model/log-provider.contract';
import { MetricProviderContract } from '@modules/contract/model/metric-provider.contract';
import { TaskRunDao } from '@plugins/task/task-run.dao';
import { TaskRunService } from '@plugins/task/task-run.service';
import { TaskSchedulerContract } from '@modules/contract/model/task-scheduler.contract';
import { TaskQueueContract } from '@modules/contract/model/task-queue.contract';
import { TaskExecutorService } from '@plugins/task/task-executor.service';

const task: FastifyPluginAsync = async (fastify) => {
  const { pg, contractMap } = fastify;
  const { env, log, metric, scheduler, queue } = contractMap;

  const taskExecutorService = new TaskExecutorService(
    env as EnvProviderContract,
    scheduler as TaskSchedulerContract,
    queue as TaskQueueContract
  );

  const taskRunDao = new TaskRunDao(pg);
  const taskRunService = new TaskRunService(
    taskRunDao,
    log as LogProviderContract,
    metric as MetricProviderContract
  );

  const taskDao = new TaskDao(pg);
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
    fastify: ['pg', 'contractMap', 'authHooks'],
  },
  dependencies: ['pg', 'schema', 'authentication', 'authorization'],
});
