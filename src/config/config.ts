import { ServerConfig } from './model/server.config';
import 'dotenv/config';

export const SERVER_CONFIG = 'SERVER';

export const config = {
  [SERVER_CONFIG]: {
    port: process.env.PORT ?? 8080,
    host: process.env.HOST ?? '0.0.0.0',
    logger: true,
  } as ServerConfig,
};
