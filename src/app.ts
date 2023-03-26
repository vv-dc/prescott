import { join } from 'path';
import { FastifyPluginAsync } from 'fastify';
import fastifyAutoload, { AutoloadPluginOptions } from '@fastify/autoload';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import { handleError } from '@modules/fastify/error-handler';

export type AutoloadOptions = {
  // additional options
} & Partial<AutoloadPluginOptions>;

const app: FastifyPluginAsync<AutoloadOptions> = async (fastify, opts) => {
  await fastify.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'Prescott',
        description: 'Lightweight server for automation purposes',
        version: '1.0.0',
      },
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  });
  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'none',
    },
  });
  await fastify.register(fastifyAutoload, {
    dir: join(__dirname, 'plugins'),
    options: opts,
    maxDepth: 1,
  });
  fastify.setErrorHandler(handleError);
};

export { app };
