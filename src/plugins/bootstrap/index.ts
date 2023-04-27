import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { config, PRESCOTT_CONFIG } from '@config/config';
import { getRootConfig } from '@modules/bootstrap/config-loader';

const { workDir } = config[PRESCOTT_CONFIG];

const boostrap: FastifyPluginAsync = async (fastify) => {
  const rootConfig = await getRootConfig(workDir);
  fastify.log.info(`Root config loaded from ${workDir}`);

  fastify.decorate('contractMap', rootConfig.contractMap);
};

export default fp(boostrap, {
  name: 'bootstrap',
});
