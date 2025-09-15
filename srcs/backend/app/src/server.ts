import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyCookie from '@fastify/cookie';

import dbPlugin from '../index.js';
import authPlugin from './plugins/auth.ts';
import userPlugin from './plugins/user.ts';
import wsGame from './plugins/ws-game.ts';
import Settings from './plugins/settings.ts';
import authHook from './plugins/authHook.ts';
import Send2faMail from './plugins/2fa.ts';
import GoogleAuth from './plugins/google.ts';
import Chat from './plugins/chat.ts';

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

  await fastify.register(authHook);
  await fastify.register(dbPlugin);
  await fastify.register(authPlugin);
  await fastify.register(GoogleAuth);
  await fastify.register(Send2faMail);
  await fastify.register(userPlugin);
  await fastify.register(wsGame);
  await fastify.register(Settings);
  await fastify.register(Chat);

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
