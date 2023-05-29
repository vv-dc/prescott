import { Knex } from 'knex';
import { config, DATABASE_CONFIG } from './src/config/config';

const { connection, client } = config[DATABASE_CONFIG];

const knexConfig: Knex.Config = {
  client,
  connection,
  pool: {
    min: 2,
    max: 10,
  },
  useNullAsDefault: false,
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
};

export { knexConfig };
export default knexConfig;
