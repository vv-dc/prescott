import { knex, Knex } from 'knex';
import { camelCaseToSnakeCase, objectToCamelCase } from '@lib/case.utils';

export const buildDatabaseConnection = (config: Knex.Config): Knex =>
  knex({
    ...config,
    wrapIdentifier: (value) => camelCaseToSnakeCase(value),
    postProcessResponse: (result) => objectToCamelCase(result),
  });
