import { FastifyPluginAsync } from 'fastify';

import { AuthorizationCreateGroupDto } from '@model/dto/authorization-create-group.dto';
import { AuthorizationAddToGroupDto } from '@model/dto/authorization-add-to-group.dto';
import { GroupId } from '@model/api/authorization/group-id';
import { UserGroupParams } from '@model/api/authorization/user-group-params';
import { AccessToken } from '@model/api/authentication/access-token';
import { AuthorizationAddRoleDto } from '@model/dto/authorization-add-role.dto';
import { UserRoleParams } from '@model/api/authorization/user-role-params';

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
      headers: fastify.getSchema('api/authentication/access-token.json'),
      body: fastify.getSchema('dto/authorization-create-group.json'),
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
      headers: fastify.getSchema('api/authentication/access-token.json'),
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
    Body: AuthorizationAddToGroupDto;
  }>({
    url: '/:groupId/users',
    method: 'POST',
    schema: {
      headers: fastify.getSchema('api/authentication/access-token.json'),
      params: fastify.getSchema('api/authorization/group-id.json'),
      body: fastify.getSchema('dto/authorization-add-to-group.json'),
    },
    preHandler: [authHooks.roleHook('group_manager')],
    handler: async (request, reply) => {
      const { groupId } = request.params;
      const { userId } = request.body;
      await authService.addUserToGroup(groupId, userId);
      reply.code(204).send();
    },
  });

  fastify.route<{ Params: UserGroupParams; Headers: AccessToken }>({
    url: '/:groupId/users/:userId',
    method: 'DELETE',
    schema: {
      headers: fastify.getSchema('api/authentication/access-token.json'),
      params: fastify.getSchema('api/authorization/user-group-params.json'),
    },
    preHandler: [authHooks.roleHook('group_manager')],
    handler: async (request, reply) => {
      const { userId: managerId } = request.payload;
      const { groupId, userId } = request.params;
      await authService.deleteUserFromGroup(groupId, managerId, userId);
      reply.code(204).send();
    },
  });

  fastify.route<{
    Params: UserGroupParams;
    Headers: AccessToken;
    Body: AuthorizationAddRoleDto;
  }>({
    url: '/:groupId/users/:userId/roles',
    method: 'POST',
    schema: {
      headers: fastify.getSchema('api/authentication/access-token.json'),
      params: fastify.getSchema('api/authorization/user-group-params.json'),
      body: fastify.getSchema('dto/authorization-add-role.json'),
    },
    preHandler: [authHooks.roleHook('role_manager')],
    handler: async (request, reply) => {
      const { role } = request.body;
      const { userId: managerId } = request.payload;
      const { groupId, userId } = request.params;
      await authService.addUserRole(groupId, managerId, userId, role);
      reply.code(204).send();
    },
  });

  fastify.route<{ Params: UserRoleParams; Headers: AccessToken }>({
    url: '/:groupId/users/:userId/roles/:role',
    method: 'DELETE',
    schema: {
      headers: fastify.getSchema('api/authentication/access-token.json'),
      params: fastify.getSchema('api/authorization/user-role-params.json'),
    },
    preHandler: [authHooks.roleHook('role_manager')],
    handler: async (request, reply) => {
      const { userId: managerId } = request.payload;
      const { role, groupId, userId } = request.params;
      await authService.deleteUserRole(groupId, managerId, userId, role);
      reply.code(204).send();
    },
  });
};
