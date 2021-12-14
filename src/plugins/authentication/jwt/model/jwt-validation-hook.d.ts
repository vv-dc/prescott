import { FastifyInstance, FastifyReply } from 'fastify';

import { AuthRequest } from '@model/shared/auth-request';

export type JwtValidationHook = (
  this: FastifyInstance,
  request: AuthRequest,
  reply: FastifyReply
) => Promise<FastifyReply | void>;
