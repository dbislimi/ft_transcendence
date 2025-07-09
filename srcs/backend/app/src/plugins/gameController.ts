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
	fastify.get("/game/ws", { websocket: true }, (socket: WebSocket, req) => {
		const clientId = uuidv4();
		let player: { playerId: 0 | 1 | undefined; gameId: number } | undefined;
		socket.on("message", (message) => {
			const data = JSON.parse(message.toString());
			console.log(data);
			if (data.event === "start") {
				switch (data.body.action) {
					case "play_online":
						player = games.startOnline(clientId, socket);
						break;
					case "cancel":
						games.removeFromQueue(clientId);
						player = undefined;
						break;
					case "play_offline":
						player = games.startOffline(socket, data.body.diff);
						break;
				}
			} else if (data.event === "play" && player !== undefined) {
				if (player.playerId === undefined)
					games
						.getRoom(player.gameId)
						?.move(data.body.type, data.body.dir, data.body.id);
				else
					games
						.getRoom(player.gameId)
						?.move(data.body.type, data.body.dir, player.playerId);
			}
		});
		socket.on("close", () => {
			console.log("close ", clientId);
			games.removeFromQueue(clientId);
			if (!player) return;
			games.getRoom(player.gameId)?.pause();
			games.removeRoom(player.gameId);
		});
	});
};

export default fp(gameController);
