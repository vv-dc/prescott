import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export type Hook<T> = (
  this: FastifyInstance,
  request: FastifyRequest<T>,
  reply: FastifyReply
) => Promise<FastifyReply | void>;
