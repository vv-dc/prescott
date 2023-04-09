import Fastify from 'fastify';
import fp from 'fastify-plugin';

import { app } from '@src/app';

describe('app e2e', () => {
  it('should register all plugins and start application', async () => {
    const fastify = Fastify({
      logger: true,
      // pluginTimeout: 24000000,
    });
    await fastify.register(fp(app));
    expect(fastify.contractMap).toBeDefined();
    expect(Object.keys(fastify.getSchemas()).length).toBeGreaterThan(1);
  });
});
