import 'dotenv/config';
import { join } from 'path';
import { argon2id } from 'argon2';

import { PgConfig } from '@config/model/pg.config';
import { ServerConfig } from '@config/model/server.config';
import { SchemasConfig } from '@config/model/schemas.config';
import { PasswordConfig } from '@config/model/password.config';
import { JwtConfig } from '@config/model/jwt.config';

export const SERVER_CONFIG = 'SERVER';
export const PG_CONFIG = 'PG';
export const SCHEMAS_CONFIG = 'SCHEMAS';
export const PASSWORD_CONFIG = 'PASSWORD';
export const JWT_CONFIG = 'JWT';

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
  [SCHEMAS_CONFIG]: {
    path: join(__dirname, '../', 'schemas/'),
  } as SchemasConfig,
  [PASSWORD_CONFIG]: {
    type: argon2id,
    timeCost: 2,
    memoryCost: 15360,
  } as PasswordConfig,
  [JWT_CONFIG]: {
    secret: process.env.JWT_SECRET,
    expiresIn: 9e5,
  } as JwtConfig,
};
