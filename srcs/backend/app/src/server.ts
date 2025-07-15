import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';

import dbPlugin from '../index.js';
import userPlugin from './plugins/user.ts';
import wsGame from './plugins/ws-game.ts';
import RegisterLogin from './plugins/auth.ts';
import Settings from './plugins/settings.ts';

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
  await fastify.register(RegisterLogin);
  await fastify.register(userPlugin);
  await fastify.register(wsGame);
  await fastify.register(Settings);

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
