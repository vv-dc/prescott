import { FastifyInstance, FastifyReply } from 'fastify';

import { HttpUnauthorized } from '@modules/errors/http-errors';
import { AuthRequest } from '@model/shared/auth-request';

export const jwtValidationHook = async function (
  this: FastifyInstance,
  request: AuthRequest<{ Body: { accessToken: string } }>,
  reply: FastifyReply
): Promise<FastifyReply | void> {
  try {
    const { accessToken } = request.body;
    const payload = await this.jwtService.verify(accessToken);
    request.payload = payload;
  } catch {
    const error = new HttpUnauthorized('Invalid access token');
    reply.code(error.statusCode).send(error);
    return reply;
  }
};
