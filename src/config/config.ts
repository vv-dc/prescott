import 'dotenv/config';
import { join } from 'path';
import { argon2id } from 'argon2';

import { PgConfig } from '@config/model/pg.config';
import { ServerConfig } from '@config/model/server.config';
import { SchemasConfig } from '@config/model/schemas.config';
import { PasswordConfig } from '@config/model/password.config';
import { JwtConfig } from '@config/model/jwt.config';
import { AuthConfig } from '@config/model/auth.config';
import { SwaggerOptions } from 'fastify-swagger';

export const SERVER_CONFIG = 'SERVER';
export const PG_CONFIG = 'PG';
export const SCHEMAS_CONFIG = 'SCHEMAS';
export const AUTH_CONFIG = 'AUTH';
export const SWAGGER_CONFIG = 'SWAGGER';

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
  } as AuthConfig,
  [SWAGGER_CONFIG]: {
    routePrefix: '/documentation',
    exposeRoute: true,
    refResolver: 'fastify',
    swagger: {
      info: {
        title: 'Prescott',
        description: 'Lightweight server for automation purposes',
        version: '0.0.1',
      },
      externalDocs: {
        url: 'https://swagger.io',
        description: 'Find more info here',
      },
      host: process.env.HOST ?? 'localhost',
      schemes: [process.env.PROTOCOL ?? 'http'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  } as SwaggerOptions,
};
