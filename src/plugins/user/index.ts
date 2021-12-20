import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { UserDao } from '@plugins/user/user.dao';
import { UserService } from '@plugins/user/user.service';

const user: FastifyPluginAsync = async (fastify) => {
  const userDao = new UserDao(fastify.pg);
  const userService = new UserService(userDao);
  fastify.decorate('userService', userService);
};

export default fp(user, { name: 'user', dependencies: ['pg'] });
