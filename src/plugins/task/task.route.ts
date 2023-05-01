import { FastifyPluginAsync } from 'fastify';

import { TaskCreateParams } from '@model/api/task/task-create-params';
import {
  LocalTaskConfig,
  RepositoryTaskConfig,
  TaskConfigDto,
} from '@model/dto/task-config.dto';
import { TaskAllParams } from '@model/api/task/task-all-params';
import { AccessToken } from '@model/api/authentication/access-token';
import { TaskRunSearchQuery } from '@model/api/task/task-run-search-query';
import { TaskRunAllParams } from '@model/api/task/task-run-all-params';
import { TaskRunHandle } from '@modules/contract/model/task-run-handle';
import { LogSearchDto } from '@modules/contract/model/log-provider.contract';
import { MetricSearchDto } from '@modules/contract/model/metric-provider.contract';

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  const { taskService, taskRunService, authHooks, jwtValidationHook } = fastify;

  fastify.addHook('preValidation', jwtValidationHook);

  fastify.route<{
    Params: TaskCreateParams;
    Body: TaskConfigDto;
    Headers: AccessToken;
  }>({
    method: 'POST',
    url: '/groups/:groupId/tasks',
    schema: {
      params: fastify.getPrescottSchema('api/task/task-create-params'),
      body: fastify.getPrescottSchema('dto/task-config.dto'),
      response: {
        200: fastify.getPrescottSchema('api/task/task-id-response'),
      },
    },
    preHandler: [authHooks.permissionHook('create_task')],
    handler: async (request, reply) => {
      const { groupId } = request.params;
      const { userId } = request.payload;
      const taskId = await taskService.createTask(
        groupId,
        userId,
        request.body
      );
      reply.code(201).send({ taskId });
    },
  });

  fastify.route<{
    Params: TaskAllParams;
    Headers: AccessToken;
  }>({
    method: 'GET',
    url: '/groups/:groupId/tasks/:taskId',
    schema: {
      params: fastify.getPrescottSchema('api/task/task-all-params'),
      response: {
        200: {
          $merge: {
            source: fastify.getPrescottSchema('domain/task'),
            with: {
              properties: {
                config: fastify.getPrescottSchema('dto/task-config.dto'),
              },
            },
          },
        },
      },
    },
    preHandler: [authHooks.permissionHook('view_task')],
    handler: async (request, reply) => {
      const { taskId } = request.params;
      const task = await taskService.getTask(taskId);
      reply.code(200).send(task);
    },
  });

  fastify.route<{ Params: TaskAllParams; Headers: AccessToken }>({
    method: 'DELETE',
    url: '/groups/:groupId/tasks/:taskId',
    schema: {
      params: fastify.getPrescottSchema('api/task/task-all-params'),
    },
    preHandler: [authHooks.permissionHook('delete_task')],
    handler: async (request, reply) => {
      const { taskId } = request.params;
      await taskService.deleteTask(taskId);
      reply.code(204).send();
    },
  });

  fastify.route<{
    Params: TaskAllParams;
    Body: LocalTaskConfig | RepositoryTaskConfig;
    Headers: AccessToken;
  }>({
    method: 'PUT',
    url: '/groups/:groupId/tasks/:taskId',
    schema: {
      params: fastify.getPrescottSchema('api/task/task-all-params'),
      body: fastify.getPrescottSchema('domain/task-config'),
    },
    preHandler: [authHooks.permissionHook('update_task')],
    handler: async (request, reply) => {
      const { taskId, groupId } = request.params;
      await taskService.updateTask(groupId, taskId, request.body);
      reply.code(204).send();
    },
  });

  fastify.route<{
    Params: TaskAllParams;
    Headers: AccessToken;
  }>({
    method: 'POST',
    url: '/groups/:groupId/tasks/:taskId/stop',
    schema: {
      params: fastify.getPrescottSchema('api/task/task-all-params'),
    },
    preHandler: [authHooks.permissionHook('stop_task')],
    handler: async (request, reply) => {
      const { taskId } = request.params;
      await taskService.stopTask(taskId);
      reply.code(204).send();
    },
  });

  fastify.route<{ Params: TaskAllParams; Headers: AccessToken }>({
    method: 'POST',
    url: '/groups/:groupId/tasks/:taskId/start',
    schema: {
      params: fastify.getPrescottSchema('api/task/task-all-params'),
    },
    preHandler: [authHooks.permissionHook('start_task')],
    handler: async (request, reply) => {
      const { taskId } = request.params;
      await taskService.startTask(taskId);
      reply.code(204).send();
    },
  });

  fastify.route<{ Params: TaskAllParams; Headers: AccessToken }>({
    method: 'GET',
    url: '/groups/:groupId/tasks/:taskId/runs',
    schema: {
      params: fastify.getPrescottSchema('api/task/task-all-params'),
      response: {
        200: fastify.getPrescottSchema('api/task/task-get-runs'),
      },
    },
    preHandler: [authHooks.permissionHook('view_task')],
    handler: async (request, reply) => {
      const { taskId } = request.params;
      const runs = await taskRunService.getAll(taskId);
      reply.code(200).send(runs);
    },
  });

  fastify.route<{
    Params: TaskRunAllParams;
    Headers: AccessToken;
    Querystring: TaskRunSearchQuery;
  }>({
    method: 'GET',
    url: '/groups/:groupId/tasks/:taskId/runs/:runId/logs',
    schema: {
      params: fastify.getPrescottSchema('api/task/task-run-all-params'),
      querystring: fastify.getPrescottSchema('api/task/task-run-search-query'),
      response: {
        200: fastify.getPrescottSchema('api/task/task-run-log-response'),
      },
    },
    preHandler: [authHooks.permissionHook('view_task')],
    handler: async (request, reply) => {
      const { taskId, runId } = request.params;
      const { paging, search } = request.query;

      const runHandle: TaskRunHandle = { taskId, runId };
      const logs = await taskRunService.searchLogs(
        runHandle,
        (search ?? {}) as LogSearchDto,
        paging ?? {}
      );
      reply.code(200).send(logs);
    },
  });

  fastify.route<{
    Params: TaskRunAllParams;
    Headers: AccessToken;
    Querystring: TaskRunSearchQuery;
  }>({
    method: 'GET',
    url: '/groups/:groupId/tasks/:taskId/runs/:runId/metrics',
    schema: {
      params: fastify.getPrescottSchema('api/task/task-run-all-params'),
      querystring: fastify.getPrescottSchema('api/task/task-run-search-query'),
      response: {
        200: fastify.getPrescottSchema('api/task/task-run-metric-response'),
      },
    },
    preHandler: [authHooks.permissionHook('view_task')],
    handler: async (request, reply) => {
      const { taskId, runId } = request.params;
      const { paging, search } = request.query;

      const runHandle: TaskRunHandle = { taskId, runId };
      const metrics = await taskRunService.searchMetrics(
        runHandle,
        (search ?? {}) as MetricSearchDto,
        paging ?? {}
      );
      reply.code(200).send(metrics);
    },
  });
};
