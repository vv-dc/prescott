import { FastifyRequest } from 'fastify';

import { UserPayload } from '@model/domain/user-payload';

export interface AuthRequest<T> extends FastifyRequest<T> {
  payload: UserPayload | null;
}
