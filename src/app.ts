import { join } from 'path';
import { FastifyPluginAsync } from 'fastify';
import fastifyAutoload, { AutoloadPluginOptions } from 'fastify-autoload';

export type AutoloadOptions = {
  // additional options
} & Partial<AutoloadPluginOptions>;

const app: FastifyPluginAsync<AutoloadOptions> = async (fastify, opts) => {
  fastify.register(fastifyAutoload, {
    dir: join(__dirname, 'plugins'),
    options: opts,
  });
};

export { app };
