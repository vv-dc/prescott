import { join } from 'path';
import { FastifyPluginAsync } from 'fastify';
import fastifyAutoload, { AutoloadPluginOptions } from 'fastify-autoload';
import fastifySwagger from 'fastify-swagger';

import { handleError } from '@modules/fastify/error-handler';
import { config, SWAGGER_CONFIG } from '@config/config';

export type AutoloadOptions = {
  // additional options
} & Partial<AutoloadPluginOptions>;

const app: FastifyPluginAsync<AutoloadOptions> = async (fastify, opts) => {
  fastify.register(fastifySwagger, config[SWAGGER_CONFIG]);
  fastify.register(fastifyAutoload, {
    dir: join(__dirname, 'plugins'),
    options: opts,
    maxDepth: 1,
  });
  fastify.setErrorHandler(handleError);
};

export { app };
