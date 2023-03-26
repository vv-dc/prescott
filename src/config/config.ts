import 'dotenv/config';
import { join } from 'path';
import { argon2id } from 'argon2';

import { PgConfig } from '@config/model/pg.config';
import { ServerConfig } from '@config/model/server.config';
import { SchemasConfig } from '@config/model/schemas.config';
import { PasswordConfig } from '@config/model/password.config';
import { JwtConfig } from '@config/model/jwt.config';
import { AuthConfig } from '@config/model/auth.config';

export const SERVER_CONFIG = 'SERVER';
export const PG_CONFIG = 'PG';
export const SCHEMAS_CONFIG = 'SCHEMAS';
export const AUTH_CONFIG = 'AUTH';

export const config: {
  [SERVER_CONFIG]: ServerConfig;
  [PG_CONFIG]: PgConfig;
  [SCHEMAS_CONFIG]: SchemasConfig;
  [AUTH_CONFIG]: AuthConfig;
} = {
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
    schemasPath: join(__dirname, '../', 'schemas/'),
    schemasIdPrefix: 'schema://prescott.dev/',
    tsPath: join(__dirname, '../', 'model'),
    ajvOptions: {
      allowUnionTypes: true,
    },
  },
  [AUTH_CONFIG]: {
    passwordConfig: {
      type: argon2id,
      timeCost: 2,
      memoryCost: 15360,
    } as PasswordConfig,
    jwtConfig: {
      secret: process.env.JWT_SECRET,
      accessExpiresIn: 900, // in seconds
      refreshExpiresIn: 5.184e9,
    } as JwtConfig,
    maxSessions: 5,
  },
};
