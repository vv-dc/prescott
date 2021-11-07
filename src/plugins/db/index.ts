import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Knex, knex } from 'knex';

import { knexConfig } from 'knexfile';

const pg: FastifyPluginAsync = async (fastify) => {
  const pg = knex(knexConfig);
  fastify.decorate('pg', pg);
};

export default fp(pg, { name: 'pg' });

declare module 'fastify' {
  interface FastifyInstance {
    pg: Knex;
  }
}
