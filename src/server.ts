import Fastify, { FastifyPluginAsync } from 'fastify';
import { SERVER_CONFIG, config } from '@config/config';
import { app } from './app';

const { port, host, logger } = config[SERVER_CONFIG];

const bootstrap = async (app: FastifyPluginAsync) => {
  try {
    const server = Fastify({ logger });
    server.register(app);
    server.listen(port, host, () => {
      console.log(`Server started on http://${host}:${port}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

bootstrap(app);
