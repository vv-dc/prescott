import { FastifyPluginAsync } from 'fastify';
import { AuthenticationRefreshTokensDto } from '@model/dto/authentication-refresh-tokens.dto';
import { EntityConflict } from '@modules/errors/abstract-errors';
import { UserIdParams } from '@model/api/user/task-id-params';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  const { userService, jwtValidationHook, groupService } = fastify;
  fastify.addHook('preValidation', jwtValidationHook);

  fastify.route<{ Body: AuthenticationRefreshTokensDto }>({
    url: '/users/:userId',
    method: 'GET',
    schema: {
      response: {
        200: fastify.getPrescottSchema('dto/user.dto'),
      },
    },
    handler: async (request, reply) => {
      const { userId } = request.payload;
      const user = await userService.findByIdThrowable(userId);
      const { id, password, ...rest } = user;
      reply.code(200).send(rest);
    },
  });

  fastify.route<{
    Body: AuthenticationRefreshTokensDto;
    Params: UserIdParams;
  }>({
    url: '/users/:userId/groups',
    method: 'GET',
    schema: {
      params: fastify.getPrescottSchema('api/user/user-id-params'),
      response: {
        200: {
          type: 'array',
          items: fastify.getPrescottSchema('domain/group'),
        },
      },
    },
    handler: async (request, reply) => {
      const { userId: tokenUserId } = request.payload;
      const { userId } = request.params;
      if (userId !== tokenUserId) {
        throw new EntityConflict('ID from token is not equal to provided ID');
      }
      const groups = await groupService.findAllByUserId(tokenUserId);
      reply.code(200).send(groups);
    },
  });
};

export default userRoutes;
