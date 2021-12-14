import { FastifyPluginAsync } from 'fastify';

import { AuthorizationCreateGroupDto } from '@model/dto/authorization-create-group.dto';

export const authoriationRoutes: FastifyPluginAsync = async (fastify) => {
  const { authorizationService, jwtValidationHook } = fastify;

  fastify.route<{ Body: AuthorizationCreateGroupDto }>({
    url: '/',
    method: 'POST',
    schema: {
      body: fastify.getSchema('dto/authorization-create-group.json'),
      response: {
        200: fastify.getSchema('api/authorization/group-id.json'),
      },
    },
    preValidation: [jwtValidationHook],
    handler: async (request, reply) => {
      const { groupName } = request.body;
      const { userId } = request.payload;
      const groupId = await authorizationService.createGroup(groupName, userId);
      reply.code(200).send({ groupId });
    },
  });
};
