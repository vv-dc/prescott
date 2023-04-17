import { join } from 'node:path';
import Fastify, { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyAutoload, { AutoloadPluginOptions } from '@fastify/autoload';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import bootstrap from '@plugins/bootstrap';

import { handleError } from '@modules/fastify/error-handler';
import { config, SCHEMAS_CONFIG, SERVER_CONFIG } from '@config/config';

const { logger } = config[SERVER_CONFIG];
const { ajvOptions } = config[SCHEMAS_CONFIG];

export type AutoloadOptions = {
  // additional options
} & Partial<AutoloadPluginOptions>;

const app: FastifyPluginAsync<AutoloadOptions> = async (fastify, opts) => {
  await fastify.register(bootstrap); // set up everything
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
    ignoreFilter: (path) => path.includes('bootstrap/index'),
    options: opts,
    maxDepth: 1,
  });

  fastify.setErrorHandler(handleError);
  fastify.addHook('onClose', async () => {
    await fastify.pg.destroy();
  });
};

const buildServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    logger,
    ajv: { customOptions: ajvOptions },
  });
  await server.register(fp(app));
  return server;
};

export { buildServer };
