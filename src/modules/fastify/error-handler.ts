import { FastifyReply, FastifyRequest } from 'fastify';

import { mapError } from '@modules/errors/error-mapper';
import { replyWithError } from '@modules/fastify/reply-with-error';
import { HttpError } from '@modules/errors/http-errors';

export const handleError = async (
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const mappedError = mapError(error);
  request.log.warn(mappedError, 'Error occurred');
  if (mappedError instanceof HttpError) {
    return replyWithError(reply, mappedError);
  }
  throw mappedError;
};
