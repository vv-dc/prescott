import {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  RouteGenericInterface,
} from 'fastify';

export type Hook<T extends RouteGenericInterface> = (
  this: FastifyInstance,
  request: FastifyRequest<T>,
  reply: FastifyReply
) => Promise<FastifyReply | void>;
