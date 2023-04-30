// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as fastify from 'fastify';

import { TaskService } from '@plugins/task/task.service';
import { UserService } from '@plugins/user/user.service';
import { AuthenticationService } from '@plugins/authentication/authentication.service';
import { AuthorizationService } from '@plugins/authorization/authorization.service';
import { JwtValidationHook } from '@plugins/authentication/jwt/model/jwt-validation-hook';
import { AuthHooks } from '@plugins/authorization/model/auth-hooks';
import { PgConnection } from '@model/shared/pg-connection';
import { UserPayload } from '@model/domain/user-payload';
import { JwtService } from '@plugins/authentication/jwt/jwt.service';
import { ContractMap } from '@modules/contract/model/contract-config';

declare module 'fastify' {
  export interface FastifyInstance {
    pg: PgConnection;
    taskService: TaskService;
    userService: UserService;
    authenticationService: AuthenticationService;
    authorizationService: AuthorizationService;
    jwtService: JwtService;
    jwtValidationHook: JwtValidationHook;
    authHooks: AuthHooks;
    getPrescottSchema: (schemaId: string) => unknown;
    contractMap: ContractMap;
  }

  export interface FastifyRequest {
    payload: UserPayload;
  }
}
