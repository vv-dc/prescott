import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { knexConfig } from '../../../knexfile';
import { DbConnection } from '@model/shared/db-connection';
import { buildDatabaseConnection } from '@modules/database/build-connection';

const db: FastifyPluginAsync = async (fastify) => {
  const db: DbConnection = buildDatabaseConnection(knexConfig);
  fastify.decorate('db', db);
};

export default fp(db, { name: 'db' });
