import Fastify from "fastify";
import cors from "@fastify/cors";

import multipart from "@fastify/multipart";
import fastifyFormbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import wsController from "./plugins/websockets.js";
import dbPlugin from "../index.js";
import authPlugin from "./plugins/auth.js";
import authHook from "./plugins/authHook.js";
import userPlugin from "./plugins/user.js";
import wsFriends from "./plugins/ws-friends.js";
import matchHistoryPlugin from "./plugins/matchHistory.js";
import googleAuth from "./plugins/google.js";
import settingsPlugin from "./plugins/settings.js";
import twoFaPlugin from "./plugins/2fa.js";
import bombPartyWSHandlers from "./modules/bombparty/wsHandlers.js";
import bombPartyStatsRoutes from "./modules/bombparty/statsRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOSTNAME = process.env.HOSTNAME || "localhost";

const httpsOptions = {
	key: fs.readFileSync(path.join(__dirname, "../../certs/key.pem")),
	cert: fs.readFileSync(path.join(__dirname, "../../certs/cert.pem")),
};

const fastify = Fastify({
	logger:
		process.env.NODE_ENV === "development"
			? {
					transport: {
						target: "pino-pretty",
						options: {
							colorize: true,
							translateTime: "SYS:standard",
							ignore: "pid,hostname",
						},
					},
				}
			: true,
	https: httpsOptions,
});

async function main() {
	await fastify.register(cors, {
		origin: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		exposedHeaders: ["Content-Length"],
		credentials: true,
		maxAge: 86400,
	});

	await fastify.register(websocket);

	// 2. wsController apres WebSocket
	await fastify.register(wsController);

	// 2. Plugins de base

	await fastify.register(fastifyFormbody);
	await fastify.register(multipart);

	// 3. Database
	await fastify.register(dbPlugin);

	// 4. Nettoyage des statuts en ligne au demarrage
	await new Promise<void>((resolve, reject) => {
		fastify.db.run("UPDATE users SET online = 0", (err: any) => {
			if (err) {
				fastify.log.error(
					{ err },
					"Erreur lors du nettoyage des statuts en ligne",
				);
				reject(err);
			} else {
				fastify.log.info(
					"Statuts des utilisateurs remis à zero au demarrage",
				);
				resolve();
			}
		});
	});

	// 5. WebSocket Friends
	await fastify.register(wsFriends);

	// 6. Auth et utilisateurs
	await fastify.register(authHook);
	await fastify.register(authPlugin);
	await fastify.register(googleAuth);
	await fastify.register(userPlugin);
	await fastify.register(settingsPlugin);
	await fastify.register(twoFaPlugin);
	await fastify.register(matchHistoryPlugin);

	await fastify.register(bombPartyWSHandlers);

	console.log("[Stats] Enregistrement des routes de statistiques...");
	await fastify.register(bombPartyStatsRoutes);
	console.log("[Stats] Statistics routes registered");

	await fastify.register(fastifyStatic, {
		root: path.join(__dirname, "public"),
		prefix: "/",
	});

	fastify.get("/", async () => ({ hello: "from docker" }));

	fastify.get("/health", async () => ({ status: "ok" }));

	try {
		// Port 3001 avec HTTPS
		const address = await fastify.listen({ port: 3001, host: "0.0.0.0" });
		fastify.log.info(`Serveur HTTPS lance sur ${address}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
}

main();
