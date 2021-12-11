import { FastifyPluginAsync } from 'fastify';
import { TaskCreateParams } from '@model/api/task/task-create-params';
import { TaskConfigDto } from '@model/dto/task-config-dto';
import { TaskAllParams } from '@model/api/task/task-all-params';

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
  const { taskService } = fastify;

  fastify.route<{ Params: TaskCreateParams; Body: TaskConfigDto }>({
    method: 'POST',
    url: '/groups/:groupId/users/:userId/tasks',
    schema: {
      params: fastify.getSchema('api/task/task-create-params.json'),
      // body: fastify.getSchema('dto/task-config-dto.json'),
    },
    handler: async (request, reply) => {
      const { groupId, userId } = request.params;
      const taskId = await taskService.createTask(
        groupId,
        userId,
        request.body
      );
      reply.code(201).send({ taskId });
    },
  });

  fastify.route<{ Params: TaskAllParams }>({
    method: 'GET',
    url: '/groups/:groupId/users/:userId/tasks/:taskId',
    schema: {
      params: fastify.getSchema('api/task/task-all-params.json'),
    },
    handler: async (request, reply) => {
      const { taskId } = request.params;
      const task = await taskService.getTask(taskId);
      reply.code(200).send(task);
    },
  });
};
