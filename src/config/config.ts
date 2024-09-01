import 'dotenv/config';
import * as process from 'node:process';
import * as path from 'node:path';
import { argon2id } from 'argon2';
import { LevelWithSilent } from 'pino';

import { DatabaseConfig } from '@config/model/database.config';
import { ServerConfig } from '@config/model/server.config';
import { SchemasConfig } from '@config/model/schemas.config';
import { PasswordConfig } from '@config/model/password.config';
import { AuthConfig } from '@config/model/auth.config';
import { PrescottConfig } from '@config/model/prescott.config';

export const SERVER_CONFIG = 'SERVER';
export const DATABASE_CONFIG = 'DATABASE';
export const SCHEMAS_CONFIG = 'SCHEMAS';
export const AUTH_CONFIG = 'AUTH';
export const PRESCOTT_CONFIG = 'PRESCOTT';

export const config: {
  [PRESCOTT_CONFIG]: PrescottConfig;
  [SERVER_CONFIG]: ServerConfig;
  [DATABASE_CONFIG]: DatabaseConfig;
  [SCHEMAS_CONFIG]: SchemasConfig;
  [AUTH_CONFIG]: AuthConfig;
} = {
  [PRESCOTT_CONFIG]: {
    workDir: process.env.PRESCOTT_WORKDIR || path.join(__dirname, '../workdir'),
    logLevel: (process.env.PRESCOTT_LOG_LEVEL as LevelWithSilent) || 'debug',
  },
  [DATABASE_CONFIG]: {
    client: process.env.DB_CLIENT as string,
    connection: process.env.DB_CONN_STRING as string,
  },
  [SERVER_CONFIG]: {
    port: parseInt(process.env.PORT || '', 10) ?? 8080,
    host: process.env.HOST ?? '0.0.0.0',
  },
  [SCHEMAS_CONFIG]: {
    schemasPath: path.join(__dirname, '../', 'schemas/'),
    schemasIdPrefix: 'schema://prescott.dev/',
    tsPath: path.join(__dirname, '../', 'model'),
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
      secret: process.env.JWT_SECRET as string,
      accessExpiresIn: 900, // in seconds
      refreshExpiresIn: 5.184e9,
    },
    maxSessions: 5,
  },
};
