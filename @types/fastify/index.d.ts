// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as fastify from 'fastify';
import { Knex } from 'knex';

declare module 'fastify' {
  export interface FastifyInstance {
    pg: Knex;
  }
}
