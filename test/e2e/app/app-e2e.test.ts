import { buildServer } from '@src/app';

describe.skip('app e2e', () => {
  it('should register all plugins and start application', async () => {
    const fastify = await buildServer();
    expect(fastify.contractMap).toBeDefined();
    expect(Object.keys(fastify.getSchemas()).length).toBeGreaterThan(1);
  });
});
