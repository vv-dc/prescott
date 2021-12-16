import { FastifyPluginAsync } from 'fastify';

import { AuthorizationCreateGroupDto } from '@model/dto/authorization-create-group.dto';
import { AuthorizationAddUserToGroupDto } from '@model/dto/authorization-add-user-to-group.dto';
import { GroupId } from '@model/api/authorization/group-id';
import { UserGroup } from '@model/api/authorization/user-group';
import { AccessToken } from '@model/domain/access-token';

export const authoriationRoutes: FastifyPluginAsync = async (fastify) => {
  const {
    authHooks,
    authorizationService: authService,
    jwtValidationHook,
  } = fastify;

  fastify.addHook('preValidation', jwtValidationHook);

  fastify.route<{ Body: AuthorizationCreateGroupDto; Headers: AccessToken }>({
    url: '/',
    method: 'POST',
    schema: {
      body: fastify.getSchema('dto/authorization-create-group.json'),
      headers: fastify.getSchema('domain/access-token.json'),
      response: {
        200: fastify.getSchema('api/authorization/group-id.json'),
      },
    },
    handler: async (request, reply) => {
      const { groupName } = request.body;
      const { userId } = request.payload;
      const groupId = await authService.createGroup(groupName, userId);
      reply.code(200).send({ groupId });
    },
  });

  fastify.route<{ Params: GroupId; Headers: AccessToken }>({
    url: '/:groupId',
    method: 'DELETE',
    schema: {
      headers: fastify.getSchema('domain/access-token.json'),
      params: fastify.getSchema('api/authorization/group-id.json'),
    },
    preHandler: [authHooks.groupOwnerHook],
    handler: async (request, reply) => {
      const { groupId } = request.params;
      await authService.deleteGroup(groupId);
      reply.code(204).send();
    },
  });

  fastify.route<{
    Params: GroupId;
    Headers: AccessToken;
    Body: AuthorizationAddUserToGroupDto;
  }>({
    url: '/:groupId/users',
    method: 'POST',
    schema: {
      headers: fastify.getSchema('domain/access-token.json'),
      params: fastify.getSchema('api/authorization/group-id.json'),
      body: fastify.getSchema('dto/authorization-add-user-to-group.json'),
    },
    preHandler: [authHooks.roleHook('group_manager')],
    handler: async (request, reply) => {
      const { groupId } = request.params;
      const { userId } = request.body;
      await authService.addUserToGroup(groupId, userId);
      reply.code(204).send();
    },
  });

  fastify.route<{ Params: UserGroup; Headers: AccessToken }>({
    url: '/:groupId/users/:userId',
    method: 'DELETE',
    schema: {
      headers: fastify.getSchema('domain/access-token.json'),
      params: fastify.getSchema('api/authorization/user-group.json'),
    },
    preHandler: [authHooks.roleHook('group_manager')],
    handler: async (request, reply) => {
      const { userId: managerId } = request.payload;
      const { groupId, userId } = request.params;
      await authService.deleteUserFromGroup(groupId, managerId, userId);
      reply.code(204).send();
    },
  });
};
