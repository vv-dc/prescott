import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { knex } from 'knex';

import { knexConfig } from 'knexfile';
import { camelCaseToSnakeCase, objectToCamelCase } from '@lib/case.utils';
import { PgConnection } from '@model/shared/pg-connection';

const pg: FastifyPluginAsync = async (fastify) => {
  const pg: PgConnection = knex({
    ...knexConfig,
    wrapIdentifier: (value) => camelCaseToSnakeCase(value),
    postProcessResponse: (result) => objectToCamelCase(result),
  });
  fastify.decorate('pg', pg);
};

export default fp(pg, { name: 'pg' });
