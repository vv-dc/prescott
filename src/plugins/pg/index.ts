import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { knexConfig } from '../../../knexfile';
import { PgConnection } from '@model/shared/pg-connection';
import { buildPgConnection } from '@modules/database/build-pg';

const pg: FastifyPluginAsync = async (fastify) => {
  const pg: PgConnection = buildPgConnection(knexConfig);
  fastify.decorate('pg', pg);
};

export default fp(pg, { name: 'pg' });
