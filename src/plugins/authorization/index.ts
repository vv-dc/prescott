import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { authoriationRoutes } from '@plugins/authorization/authorization.route';
import { AuthorizationService } from '@plugins/authorization/authorization.service';
import { GroupDao } from '@plugins/authorization/group/group.dao';
import { GroupService } from '@plugins/authorization/group/group.service';
import { RoleDao } from '@plugins/authorization/role/role.dao';
import { RoleService } from '@plugins/authorization/role/role.service';

const authorization: FastifyPluginAsync = async (fastify) => {
  const groupDao = new GroupDao(fastify.pg);
  const groupService = new GroupService(groupDao);

  const roleDao = new RoleDao(fastify.pg);
  const roleService = new RoleService(roleDao);

  const authorizationService = new AuthorizationService(
    groupService,
    roleService
  );
  fastify.decorate('authorizationService', authorizationService);
  fastify.register(authoriationRoutes, { prefix: '/groups' });
};

export default fp(authorization, {
  name: 'authorization',
  decorators: {
    fastify: ['jwtValidationHook'],
  },
  dependencies: ['pg', 'schema', 'authentication'],
});
