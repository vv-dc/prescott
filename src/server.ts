import { buildServer } from './app';
import { config, SERVER_CONFIG } from '@config/config';

const { host, port } = config[SERVER_CONFIG];

const bootstrap = async () => {
  try {
    const server = await buildServer();
    await server.taskService.registerFromDatabase();

    await server.listen({ port, host });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

bootstrap();
