import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { config, JWT_CONFIG, PASSWORD_CONFIG } from '@config/config';
import { authRoutes } from '@plugins/auth/auth.route';
import { PasswordService } from '@plugins/auth/services/password.service';
import { JwtService } from '@plugins/auth/services/jwt.service';
import { AuthService } from './services/auth.service';

const jwtConfig = config[JWT_CONFIG];
const passwordConfig = config[PASSWORD_CONFIG];

const auth: FastifyPluginAsync = async (fastify) => {
  const jwtService = new JwtService(jwtConfig);
  const passwordService = new PasswordService(passwordConfig);

  const authService = new AuthService(
    jwtService,
    passwordService,
    fastify.userService
  );
  fastify.decorate('authService', authService);
  fastify.register(authRoutes, { prefix: '/auth' });
};

export default fp(auth, {
  name: 'auth',
  dependencies: ['pg', 'schema', 'user'],
});
