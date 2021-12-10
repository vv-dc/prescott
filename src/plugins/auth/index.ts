import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { config, AUTH_CONFIG } from '@config/config';
import { authRoutes } from '@plugins/auth/auth.route';
import { PasswordService } from '@plugins/auth/services/password.service';
import { JwtService } from '@plugins/auth/services/jwt.service';
import { AuthService } from './services/auth.service';
import { RefreshSessionService } from './services/refresh-session.service';
import { RefreshSessionDao } from './daos/refresh-session.dao';

const { jwtConfig, passwordConfig } = config[AUTH_CONFIG];

const auth: FastifyPluginAsync = async (fastify) => {
  const jwtService = new JwtService(jwtConfig);
  const passwordService = new PasswordService(passwordConfig);

  const refreshSessionDao = new RefreshSessionDao(fastify.pg);
  const refreshSessionService = new RefreshSessionService(refreshSessionDao);

  const authService = new AuthService(
    jwtService,
    passwordService,
    refreshSessionService,
    fastify.userService
  );
  fastify.decorate('authService', authService);
  fastify.register(authRoutes, { prefix: '/auth' });
};

export default fp(auth, {
  name: 'auth',
  dependencies: ['pg', 'schema', 'user'],
});
