import 'dotenv/config';
import { PgConfig } from './model/pg.config';
import { ServerConfig } from './model/server.config';

export const SERVER_CONFIG = 'SERVER';
export const PG_CONFIG = 'PG';

export const config = {
  [SERVER_CONFIG]: {
    port: process.env.PORT ?? 8080,
    host: process.env.HOST ?? '0.0.0.0',
    logger: true,
  } as ServerConfig,
  [PG_CONFIG]: {
    host: process.env.PGHOST ?? '0.0.0.0',
    port: process.env.PGPORT ?? 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDB,
  } as PgConfig,
};
