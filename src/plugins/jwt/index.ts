import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { config, AUTH_CONFIG } from '@config/config';
import { JwtService } from '@plugins/jwt/jwt.service';
import { jwtValidationHook } from '@plugins/jwt/jwt.hooks';

const { jwtConfig } = config[AUTH_CONFIG];

const jwt: FastifyPluginAsync = async (fastify) => {
  const jwtService = new JwtService(jwtConfig);
  fastify.decorate('jwtService', jwtService);

  fastify.decorateRequest('payload', null);
  fastify.decorate('jwtValidationHook', jwtValidationHook);
};

export default fp(jwt, { name: 'jwt' });
