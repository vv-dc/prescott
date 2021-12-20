import { FastifyRequest } from 'fastify';

import { mapError } from '@modules/errors/error-mapper';

export const handleError = async (
  error: Error,
  request: FastifyRequest
): Promise<void> => {
  const mappedError = mapError(error);
  request.log.warn(mappedError, 'Error occurred');
  throw mappedError;
};
