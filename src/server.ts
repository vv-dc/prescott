import Fastify from 'fastify';

const server = Fastify({ logger: true });

server.get('/', (request, reply) => {
  reply.send({ hello: 'world' });
});

server.listen(3000, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
