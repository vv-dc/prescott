// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as fastify from 'fastify';

import { DockerService } from '@plugins/docker/docker.service';
import { UserService } from '@plugins/user/user.service';
import { AuthenticationService } from '@plugins/authentication/authentication.service';
import { JwtService } from '@plugins/authentication/jwt/jwt.service';
import { JwtValidationHook } from '@plugins/jwt/model/jwt-validation-hook';
import { PgConnection } from '@model/shared/pg-connection';

declare module 'fastify' {
  export interface FastifyInstance {
    pg: PgConnection;
    dockerService: DockerService;
    userService: UserService;
    authenticationService: AuthenticationService;
    jwtService: JwtService;
    jwtValidationHook: JwtValidationHook;
  }
}
