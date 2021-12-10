import { FastifyPluginAsync } from 'fastify';

import { AuthRegisterDto } from '@model/dto/auth-register.dto';
import { AuthLoginDto } from '@model/dto/auth-login.dto';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const { authService } = fastify;

  fastify.route<{ Body: AuthRegisterDto }>({
    method: 'POST',
    url: '/register',
    schema: {
      body: { $ref: 'dto/auth-register.json' },
    },
    handler: async (request, reply) => {
      const { body: registerData } = request;
      await authService.register(registerData);
      reply.code(204).send();
    },
  });

  fastify.route<{ Body: AuthLoginDto }>({
    url: '/login',
    method: 'POST',
    schema: {
      body: { $ref: 'dto/auth-login.json' },
      response: {
        200: { $ref: 'dto/token-pair.json' },
      },
    },
    handler: async (request, reply) => {
      const { ip, body: loginData } = request;
      const tokenPair = await authService.login(loginData, ip);
      reply.code(200).send(tokenPair);
    },
  });
};
