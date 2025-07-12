import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';

import dbPlugin from '../index.js';
import authPlugin from './plugins/auth.ts';
import userPlugin from './plugins/user.ts';
import wsGame from './plugins/ws-game.ts';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
    },
  },
});

async function main() {
  await fastify.register(cors, {
    origin: 'http://localhost:5173',
  });

  await fastify.register(websocket);

  await fastify.register(dbPlugin);
  await fastify.register(authPlugin);
  await fastify.register(userPlugin);
  await fastify.register(wsGame);

  fastify.get('/', async () => {
    return { hello: 'from docker' };
  });

  try {
    const address = await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`✅ Serveur lancé sur ${address}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
