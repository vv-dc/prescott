import { FastifyReply, FastifyRequest } from 'fastify';

import { HttpUnauthorized } from '@modules/errors/http-errors';
import { JwtService } from '@plugins/authentication/jwt/jwt.service';
import { JwtValidationHook } from '@plugins/authentication/jwt/model/jwt-validation-hook';
import { UserPayload } from '@model/domain/user-payload';
import { replyWithError } from '@modules/fastify/reply-with-error';

const BEARER = 'Bearer';

export const createValidationHook = (
  jwtService: JwtService
): JwtValidationHook => {
  const validationHook = async (
    request: FastifyRequest<{ Headers: { authorization?: string } }>,
    reply: FastifyReply
  ): Promise<FastifyReply | void> => {
    const error = new HttpUnauthorized('Invalid access token');
    const { authorization } = request.headers;

    if (!authorization || !authorization.startsWith(BEARER)) {
      return replyWithError(reply, error);
    }
    const accessToken = authorization.slice(BEARER.length).trim();
    try {
      const payload = await jwtService.verify(accessToken);
      request.payload = payload as UserPayload;
    } catch {
      return replyWithError(reply, error);
    }
  };
  return validationHook;
};
