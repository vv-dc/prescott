// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as fastify from 'fastify';
import { Knex } from 'knex';
import { DockerService } from '@plugins/docker/docker.service';

declare module 'fastify' {
  export interface FastifyInstance {
    pg: Knex;
    dockerService: DockerService;
  }
}
