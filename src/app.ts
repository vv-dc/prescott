import { join } from 'node:path';
import Fastify, { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { parse } from 'qs';
import fastifyAutoload, { AutoloadPluginOptions } from '@fastify/autoload';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import bootstrap from '@plugins/bootstrap';

import { handleError } from '@modules/fastify/error-handler';
import { config, SCHEMAS_CONFIG } from '@config/config';
import { getLogger } from '@logger/logger';

const { ajvOptions } = config[SCHEMAS_CONFIG];

export type AutoloadOptions = Partial<AutoloadPluginOptions>;

const app: FastifyPluginAsync<AutoloadOptions> = async (fastify, opts) => {
  fastify.setErrorHandler(handleError);
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
  fastify.addHook('onClose', async () => {
    await fastify.db.destroy();
  });
};

const buildServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    logger: getLogger('api'),
    ajv: { customOptions: ajvOptions },
    querystringParser: (str) => parse(str),
  });
  await server.register(fp(app));
  return server;
};

export { buildServer };
