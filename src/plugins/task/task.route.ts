import { FastifyPluginAsync } from 'fastify';
import { TaskCreateParams } from '@model/api/task/task-create-params';
import { TaskConfigDto } from '@model/dto/task-config-dto';

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
      await taskService.create(groupId, userId, request.body);
      reply.code(204).send();
    },
  });
};
