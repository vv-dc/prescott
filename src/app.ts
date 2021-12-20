import { join } from 'path';
import { FastifyPluginAsync } from 'fastify';
import fastifyAutoload, { AutoloadPluginOptions } from 'fastify-autoload';

import { handleError } from '@modules/fastify/error-handler';

export type AutoloadOptions = {
  // additional options
} & Partial<AutoloadPluginOptions>;

const app: FastifyPluginAsync<AutoloadOptions> = async (fastify, opts) => {
  fastify.register(fastifyAutoload, {
    dir: join(__dirname, 'plugins'),
    options: opts,
    maxDepth: 1,
  });
  fastify.setErrorHandler(handleError);
};

export { app };
