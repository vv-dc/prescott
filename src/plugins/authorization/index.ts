import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { authoriationRoutes } from '@plugins/authorization/authorization.route';
import { AuthorizationService } from '@plugins/authorization/authorization.service';
import { GroupDao } from '@plugins/authorization/group/group.dao';
import { GroupService } from '@plugins/authorization/group/group.service';
import { RoleDao } from '@plugins/authorization/role/role.dao';
import { RoleService } from '@plugins/authorization/role/role.service';
import { makeAuthHooks } from '@plugins/authorization/authorization.hooks';
import { PermissionDao } from '@plugins/authorization/permission/permission.dao';
import { PermissionService } from '@plugins/authorization/permission/permission.service';

const authorization: FastifyPluginAsync = async (fastify) => {
  const { pg, userService } = fastify;

  const groupDao = new GroupDao(pg);
  const groupService = new GroupService(groupDao);

  const roleDao = new RoleDao(pg);
  const roleService = new RoleService(roleDao, groupService);

  const permissionDao = new PermissionDao(pg);
  const permissionService = new PermissionService(permissionDao);

  const authHooks = makeAuthHooks(groupService, permissionService, roleService);
  fastify.decorate('authHooks', authHooks);

  const authorizationService = new AuthorizationService(
    userService,
    groupService,
    roleService
  );
  fastify.decorate('authorizationService', authorizationService);
  fastify.register(authoriationRoutes, { prefix: '/groups' });
};

export default fp(authorization, {
  name: 'authorization',
  decorators: {
    fastify: ['userService', 'jwtValidationHook'],
  },
  dependencies: ['pg', 'schema', 'user', 'authentication'],
});
