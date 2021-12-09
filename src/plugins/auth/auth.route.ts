import { FastifyPluginAsync } from 'fastify';

import { AuthRegisterDto } from '@model/dto/auth-register.dto';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const { authService } = fastify;

  fastify.route<{ Body: AuthRegisterDto }>({
    method: 'POST',
    url: '/register',
    schema: {
      body: { $ref: 'https://example.com/dto/auth-register' },
    },
    handler: async (request, reply) => {
      const { body: registerData } = request;
      await authService.register(registerData);
      reply.code(204).send();
    },
  });
};
