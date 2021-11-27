import { Knex } from 'knex';
import { config, PG_CONFIG } from './src/config/config';

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: config[PG_CONFIG],
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
};

export { knexConfig };
export default knexConfig;
