// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as fastify from 'fastify';
import { DockerService } from '@plugins/docker/docker.service';
import { UserService } from '@plugins/user/user.service';
import { AuthService } from '@plugins/auth/services/auth.service';
import { PgConnection } from '@model/shared/pg-connection';

declare module 'fastify' {
  export interface FastifyInstance {
    pg: PgConnection;
    dockerService: DockerService;
    userService: UserService;
    authService: AuthService;
  }
}
