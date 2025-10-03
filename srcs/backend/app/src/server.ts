import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyFormbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import websocketPlugin from "@fastify/websocket";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import "./types/fastify.d.ts";

import dbPlugin from "../index.js";
import authPlugin from "./plugins/auth.ts";
import authUtilsPlugin from "./utils/auth.ts";
import userPlugin from "./plugins/user.ts";
import wsGame from "./plugins/ws-game.ts";
import wsFriends from "./plugins/ws-friends.ts";
import matchesPlugin from "./plugins/matches.ts";
import leaderboardPlugin from "./plugins/leaderboard.ts";
import friendsPlugin from "./plugins/friends.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: {
    transport: { target: "pino-pretty" }
  }
});

async function main() {
  await fastify.register(cors, {
    origin: "http://localhost:5173",
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"],
    exposedHeaders: ["Content-Length"],
    credentials: true,
    maxAge: 86400,
    strictPreflight: true
  });

  await fastify.register(fastifyFormbody);
  await fastify.register(multipart);
  
  await fastify.register(dbPlugin);
  
  await new Promise<void>((resolve, reject) => {
    fastify.db.run("UPDATE users SET online = 0", (err: any) => {
      if (err) {
        fastify.log.error("Erreur lors du nettoyage des statuts en ligne:", err);
        reject(err);
      } else {
        fastify.log.info("Statuts des utilisateurs remis à zéro au démarrage");
        resolve();
      }
    });
  });
  
  await fastify.register(websocketPlugin);
  
  await fastify.register(wsFriends);
  
  await fastify.register(authUtilsPlugin);
  await fastify.register(authPlugin);
  await fastify.register(userPlugin);
  await fastify.register(wsGame);
  await fastify.register(matchesPlugin);
  await fastify.register(leaderboardPlugin);
  
  await fastify.register(friendsPlugin);

  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, "public"),
    prefix: "/"
  });

  fastify.get("/", async () => ({ hello: "from docker" }));

  try {
    const address = await fastify.listen({ port: 3000, host: "0.0.0.0" });
    fastify.log.info(`Serveur lancé sur ${address}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();