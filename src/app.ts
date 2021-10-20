import { FastifyPluginAsync } from 'fastify';

const app: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ping', (request, reply) => {
    reply.send('pong');
  });
};

export { app };
