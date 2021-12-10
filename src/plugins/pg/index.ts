import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Knex, knex } from 'knex';

import { knexConfig } from '../../../knexfile';
import { camelCaseToSnakeCase, objectToCamelCase } from '@lib/case.utils';
import { PgConnection } from '@model/shared/pg-connection';

export const buildPgConnection = (config: Knex.Config): Knex =>
  knex({
    ...config,
    wrapIdentifier: (value) => camelCaseToSnakeCase(value),
    postProcessResponse: (result) => objectToCamelCase(result),
  });

const pg: FastifyPluginAsync = async (fastify) => {
  const pg: PgConnection = buildPgConnection(knexConfig);
  fastify.decorate('pg', pg);
};

export default fp(pg, { name: 'pg' });
