import { FastifyReply } from 'fastify';

import { HttpError } from '@modules/errors/http-errors';

export const replyWithError = (
  reply: FastifyReply,
  error: HttpError
): FastifyReply => {
  reply.code(error.statusCode).send(error);
  return reply;
};
