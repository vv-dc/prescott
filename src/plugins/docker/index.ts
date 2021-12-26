import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { DockerService } from '@plugins/docker/docker.service';

export const docker: FastifyPluginAsync = async (fastify) => {
  const dockerService = new DockerService();
  fastify.decorate('dockerService', dockerService);
};

export default fp(docker, { name: 'docker' });
