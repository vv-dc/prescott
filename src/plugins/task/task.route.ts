import { FastifyPluginAsync } from 'fastify';
import { TaskCreateParams } from '@model/api/task/task-create-params';
import {
  LocalTaskConfig,
  RepositoryTaskConfig,
  TaskConfigDto,
} from '@model/dto/task-config.dto';
import { TaskAllParams } from '@model/api/task/task-all-params';
import { getTaskSchema } from '@plugins/task/task.schema';

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  const { taskService } = fastify;

  fastify.route<{ Params: TaskCreateParams; Body: TaskConfigDto }>({
    method: 'POST',
    url: '/groups/:groupId/tasks',
    schema: {
      params: fastify.getSchema('api/task/task-create-params.json'),
      body: fastify.getSchema('dto/task-config.dto.json#'),
      response: {
        200: fastify.getSchema('api/task/task-id-response.json'),
      },
    },
    handler: async (request, reply) => {
      const { groupId } = request.params;
      // TODO: remove userId here
      const taskId = await taskService.createTask(groupId, 1, request.body);
      reply.code(201).send({ taskId });
    },
  });

  fastify.route<{ Params: TaskAllParams }>({
    method: 'GET',
    url: '/groups/:groupId/tasks/:taskId',
    schema: {
      params: fastify.getSchema('api/task/task-all-params.json'),
      response: {
        200: getTaskSchema,
      },
    },
    handler: async (request, reply) => {
      const { taskId } = request.params;
      const task = await taskService.getTask(taskId);
      reply.code(200).send(task);
    },
  });

  fastify.route<{ Params: TaskAllParams }>({
    method: 'DELETE',
    url: '/groups/:groupId/tasks/:taskId',
    schema: {
      params: fastify.getSchema('api/task/task-all-params.json'),
    },
    handler: async (request, reply) => {
      const { taskId } = request.params;
      await taskService.deleteTask(taskId);
      reply.code(204).send();
    },
  });

  fastify.route<{
    Params: TaskAllParams;
    Body: LocalTaskConfig | RepositoryTaskConfig;
  }>({
    method: 'PUT',
    url: '/groups/:groupId/tasks/:taskId',
    schema: {
      params: fastify.getSchema('api/task/task-all-params.json'),
      body: fastify.getSchema('dto/task-config.dto.json#/properties/config'),
    },
    handler: async (request, reply) => {
      const { taskId, groupId } = request.params;
      await taskService.updateTask(groupId, taskId, request.body);
      reply.code(204).send();
    },
  });

  fastify.route<{
    Params: TaskAllParams;
  }>({
    method: 'POST',
    url: '/groups/:groupId/tasks/:taskId/stop',
    schema: {
      params: fastify.getSchema('api/task/task-all-params.json'),
    },
    handler: async (request, reply) => {
      const { taskId } = request.params;
      await taskService.stopTask(taskId);
      reply.code(204).send();
    },
  });

  fastify.route<{ Params: TaskAllParams }>({
    method: 'POST',
    url: '/groups/:groupId/tasks/:taskId/start',
    schema: {
      params: fastify.getSchema('api/task/task-all-params.json'),
    },
    handler: async (request, reply) => {
      const { taskId } = request.params;
      await taskService.startTask(taskId);
      reply.code(204).send();
    },
  });
};
