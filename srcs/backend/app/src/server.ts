import Fastify from 'fastify';
import cors from '@fastify/cors'

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
	origin: 'http://localhost:5173'
  })

fastify.get('/', async () => {
  return { hello: 'from dockrer' };
});

fastify.listen({ port: 3000, host: '0.0.0.0' });