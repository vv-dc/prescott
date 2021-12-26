// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as fastify from 'fastify';

import { DockerService } from '@plugins/docker/docker.service';
import { TaskService } from '@plugins/task/task.service';
import { UserService } from '@plugins/user/user.service';
import { AuthenticationService } from '@plugins/authentication/authentication.service';
import { AuthorizationService } from '@plugins/authorization/authorization.service';
import { JwtValidationHook } from '@plugins/authentication/jwt/model/jwt-validation-hook';
import { AuthHooks } from '@plugins/authorization/model/auth-hooks';
import { PgConnection } from '@model/shared/pg-connection';
import { UserPayload } from '@model/domain/user-payload';

declare module 'fastify' {
  export interface FastifyInstance {
    pg: PgConnection;
    dockerService: DockerService;
    taskService: TaskService;
    userService: UserService;
    authenticationService: AuthenticationService;
    authorizationService: AuthorizationService;
    jwtValidationHook: JwtValidationHook;
    authHooks: AuthHooks;
  }

  export interface FastifyRequest {
    payload: UserPayload;
  }
}
