import { FastifyPluginAsync } from 'fastify';

import { AuthRegisterDto } from '@model/dto/auth-register.dto';
import { AuthLoginDto } from '@model/dto/auth-login.dto';
import { RefreshTokenDto } from '@model/dto/refresh-token.dto';

export const authenticationRoutes: FastifyPluginAsync = async (fastify) => {
  const { authenticationService } = fastify;

  fastify.route<{ Body: AuthRegisterDto }>({
    method: 'POST',
    url: '/register',
    schema: {
      body: fastify.getSchema('dto/auth-register.json'),
    },
    handler: async (request, reply) => {
      const { body: registerData } = request;
      await authenticationService.register(registerData);
      reply.code(200).send();
    },
  });

  fastify.route<{ Body: AuthLoginDto }>({
    url: '/login',
    method: 'POST',
    schema: {
      body: fastify.getSchema('dto/auth-login.json'),
      response: {
        200: fastify.getSchema('dto/token-pair.json'),
      },
    },
    handler: async (request, reply) => {
      const { ip, body: loginData } = request;
      const tokenPair = await authenticationService.login(loginData, ip);
      reply.code(200).send(tokenPair);
    },
  });

  fastify.route<{ Body: RefreshTokenDto }>({
    url: '/refresh-tokens',
    method: 'POST',
    schema: {
      body: fastify.getSchema('dto/refresh-token.json'),
      response: {
        200: fastify.getSchema('dto/token-pair.json'),
      },
    },
    handler: async (request, reply) => {
      const { refreshToken } = request.body;
      const { ip } = request;
      const tokenPair = await authenticationService.refreshTokens(
        refreshToken,
        ip
      );
      reply.code(200).send(tokenPair);
    },
  });

  fastify.route<{ Body: RefreshTokenDto }>({
    url: '/logout',
    method: 'POST',
    schema: {
      body: fastify.getSchema('dto/refresh-token.json'),
    },
    handler: async (request, reply) => {
      const { refreshToken } = request.body;
      const { ip } = request;
      await authenticationService.logout(refreshToken, ip);
      reply.code(204).send();
    },
  });
};
