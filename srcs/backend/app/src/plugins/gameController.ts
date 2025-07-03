import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import type { FastifyPluginAsync } from "fastify";
import GamesManager from "../game/GamesManager.ts";

const gameController: FastifyPluginAsync<{ prefix?: string }> = async (
	fastify: FastifyInstance,
	options
) => {
	const games: GamesManager = new GamesManager();
	fastify.get(
		"/game/ws",
		{ websocket: true },
		(socket: WebSocket, req) => {
			const clientId = uuidv4();
			let playerId: 0 | 1 | undefined;
			socket.on("message", (message) => {
				const data = JSON.parse(message.toString());
				console.log(data);
				if (data.event === "start") {
					switch (data.body) {
						case "play_online":
							playerId = games.startOnline(clientId, socket);
							break;
						case "cancel":
							games.removeFromQueue(clientId);
							playerId = undefined;
							break;
						case "play_offline":
							break;
					}
				} else if (data.event === "play") {
					if (playerId !== undefined)
						games.getRoom(clientId)?.move(data.body.type, data.body.dir, playerId);
				}
			});
			socket.on("close", () => {
				console.log("close ", clientId);
				games.removeFromQueue(clientId);
				games.getRoom(clientId)?.pause();
				games.removeRoom(clientId);
			});
		}
	);
};

export default fp(gameController);
