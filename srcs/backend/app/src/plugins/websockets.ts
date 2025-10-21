import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import WebSocket from "ws";
import jwt from "jsonwebtoken";
import type { FastifyPluginAsync } from "fastify";
import GamesManager from "../pong/GamesManager.ts";
import websocket from "@fastify/websocket";
import gameController from "./gameController.ts";
import chat from "./chat.ts";
import '@fastify/cookie';
import fastifyCookie from "@fastify/cookie";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

interface Tournament {
	tournamentId: string;
	allowReconnect: boolean;
}
export interface Client {
	name: string;
	socket?: WebSocket;
	tournament?: Tournament;
	inGameId?: 0 | 1;
}

const wsController: FastifyPluginAsync<{ prefix?: string }> = async (
  fastify,
  options
) => {
  console.log("wsController plugged");
  if (!JWT_SECRET) {
    console.log(`JWT SECRET issue`);
    return;
  }
  console.log("JWT OK");
  fastify.register(fastifyCookie);
  fastify.decorate("clients", new Map<number, Client>());
  fastify.decorate("getClient", (req: FastifyRequest, socket: WebSocket): Client | null => {
    const token = req.cookies.token;
	if (!token) return null;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; name: string };
      let client = fastify.clients.get(decoded.id);
      if (client) {
        console.log("Changement de socket");
        client.socket = socket;
      } else {
        console.log("Nouvelle connexion");
        client = { name: decoded.name, socket };
        fastify.clients.set(decoded.id, client);
      }
      return client;
    } catch (e) {
      console.log(`JWT: ${e}`);
      return null;
    }
  });

  fastify.register(websocket);
  fastify.register(gameController);
  fastify.register(chat);
};

export default fp(wsController);