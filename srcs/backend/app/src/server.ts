import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

fastify.get('/', async () => {
  return { hello: 'from docker' };
});

fastify.listen({ port: 3000, host: '0.0.0.0' });