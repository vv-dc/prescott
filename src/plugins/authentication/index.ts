import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { config, AUTH_CONFIG } from '@config/config';
import { authenticationRoutes } from '@plugins/authentication/authentication.route';
import { PasswordService } from '@plugins/authentication/password/password.service';
import { AuthenticationService } from '@plugins/authentication/authentication.service';
import { RefreshSessionService } from '@plugins/authentication/refresh-session/refresh-session.service';
import { RefreshSessionDao } from '@plugins/authentication/refresh-session/refresh-session.dao';
import { JwtService } from '@plugins/authentication/jwt/jwt.service';
import { createValidationHook } from '@plugins/authentication/jwt/jwt.hooks';

const { jwtConfig, passwordConfig } = config[AUTH_CONFIG];

const authentication: FastifyPluginAsync = async (fastify) => {
  const jwtService = new JwtService(jwtConfig);
  const passwordService = new PasswordService(passwordConfig);

  const refreshSessionDao = new RefreshSessionDao(fastify.pg);
  const refreshSessionService = new RefreshSessionService(refreshSessionDao);

  const authenticationService = new AuthenticationService(
    jwtService,
    passwordService,
    refreshSessionService,
    fastify.userService
  );
  fastify.decorate('authenticationService', authenticationService);
  fastify.register(authenticationRoutes, { prefix: '/auth' });

  fastify.decorate('jwtValidationHook', createValidationHook(jwtService));
  fastify.decorate('jwtService', jwtService);
};

export default fp(authentication, {
  name: 'authentication',
  decorators: {
    fastify: ['userService'],
  },
  dependencies: ['pg', 'schema', 'user'],
});
