import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { config, AUTH_CONFIG } from '@config/config';
import { authenticationRoutes } from '@plugins/authentication/authentication.route';
import { PasswordService } from '@plugins/authentication/password/password.service';
import { AuthenticationService } from '@plugins/authentication/authentication.service';
import { RefreshSessionService } from '@plugins/authentication/refresh-session/refresh-session.service';
import { RefreshSessionDao } from '@plugins/authentication/refresh-session/refresh-session.dao';

const { passwordConfig } = config[AUTH_CONFIG];

const authentication: FastifyPluginAsync = async (fastify) => {
  const passwordService = new PasswordService(passwordConfig);
  const refreshSessionDao = new RefreshSessionDao(fastify.pg);
  const refreshSessionService = new RefreshSessionService(refreshSessionDao);

  const authenticationService = new AuthenticationService(
    fastify.jwtService,
    passwordService,
    refreshSessionService,
    fastify.userService
  );
  fastify.decorate('authenticationService', authenticationService);
  fastify.register(authenticationRoutes, { prefix: '/auth' });
};

export default fp(authentication, {
  name: 'authentication',
  decorators: {
    fastify: ['userService', 'jwtService'],
  },
  dependencies: ['pg', 'schema', 'user', 'jwt'],
});
