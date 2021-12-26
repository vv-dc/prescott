import { knex, Knex } from 'knex';
import { camelCaseToSnakeCase, objectToCamelCase } from '@lib/case.utils';

export const buildPgConnection = (config: Knex.Config): Knex =>
  knex({
    ...config,
    wrapIdentifier: (value) => camelCaseToSnakeCase(value),
    postProcessResponse: (result) => objectToCamelCase(result),
  });
