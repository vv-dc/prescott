import { FastifyPluginAsync } from 'fastify';

import { AuthenticationRegisterDto } from '@model/dto/authentication-register.dto';
import { AuthenticationLoginDto } from '@model/dto/authentication-login.dto';
import { AuthenticationRefreshTokensDto } from '@model/dto/authentication-refresh-tokens.dto';

export const authenticationRoutes: FastifyPluginAsync = async (fastify) => {
  const { authenticationService } = fastify;

  fastify.route<{ Body: AuthenticationRegisterDto }>({
    method: 'POST',
    url: '/register',
    schema: {
      body: fastify.getPrescottSchema('dto/authentication-register.dto'),
    },
    handler: async (request, reply) => {
      const { body: registerData } = request;
      await authenticationService.register(registerData);
      reply.code(200).send();
    },
  });

  fastify.route<{ Body: AuthenticationLoginDto }>({
    url: '/login',
    method: 'POST',
    schema: {
      body: fastify.getPrescottSchema('dto/authentication-login.dto'),
      response: {
        200: fastify.getPrescottSchema('dto/token-pair.dto'),
      },
    },
    handler: async (request, reply) => {
      const { ip, body: loginData } = request;
      const tokenPair = await authenticationService.login(loginData, ip);
      reply.code(200).send(tokenPair);
    },
  });

  fastify.route<{ Body: AuthenticationRefreshTokensDto }>({
    url: '/refresh-tokens',
    method: 'POST',
    schema: {
      body: fastify.getPrescottSchema('dto/authentication-refresh-tokens.dto'),
      response: {
        200: fastify.getPrescottSchema('dto/token-pair.dto'),
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

  fastify.route<{ Body: AuthenticationRefreshTokensDto }>({
    url: '/logout',
    method: 'POST',
    schema: {
      body: fastify.getPrescottSchema('dto/authentication-refresh-tokens.dto'),
    },
    handler: async (request, reply) => {
      const { refreshToken } = request.body;
      const { ip } = request;
      await authenticationService.logout(refreshToken, ip);
      reply.code(204).send();
    },
  });
};
