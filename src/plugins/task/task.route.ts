import { FastifyPluginAsync } from 'fastify';

import { getTaskSchema } from '@plugins/task/task.schema';
import { TaskCreateParams } from '@model/api/task/task-create-params';
import {
  LocalTaskConfig,
  RepositoryTaskConfig,
  TaskConfigDto,
} from '@model/dto/task-config.dto';
import { TaskAllParams } from '@model/api/task/task-all-params';
import { AccessToken } from '@model/api/authentication/access-token';

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  const { taskService, authHooks, jwtValidationHook } = fastify;

  fastify.addHook('preValidation', jwtValidationHook);

  fastify.route<{
    Params: TaskCreateParams;
    Body: TaskConfigDto;
    Headers: AccessToken;
  }>({
    method: 'POST',
    url: '/groups/:groupId/tasks',
    schema: {
      params: fastify.getSchema('api/task/task-create-params.json'),
      body: fastify.getSchema('dto/task-config.dto.json'),
      response: {
        200: fastify.getSchema('api/task/task-id-response.json'),
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

  fastify.route<{ Params: TaskAllParams; Headers: AccessToken }>({
    method: 'GET',
    url: '/groups/:groupId/tasks/:taskId',
    schema: {
      params: fastify.getSchema('api/task/task-all-params.json'),
      response: {
        200: getTaskSchema,
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
      params: fastify.getSchema('api/task/task-all-params.json'),
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
      params: fastify.getSchema('api/task/task-all-params.json'),
      // body: fastify.getSchema('dto/task-config.dto.json#/properties/config'),
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
      params: fastify.getSchema('api/task/task-all-params.json'),
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
      params: fastify.getSchema('api/task/task-all-params.json'),
    },
    preHandler: [authHooks.permissionHook('start_task')],
    handler: async (request, reply) => {
      const { taskId } = request.params;
      await taskService.startTask(taskId);
      reply.code(204).send();
    },
  });
};
