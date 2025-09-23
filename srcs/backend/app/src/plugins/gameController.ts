import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import type { FastifyPluginAsync } from "fastify";
import GamesManager from "../pong/GamesManager.ts";

type PlayerCtx = {
  mode: string;
  playerId: 0 | 1 | undefined;
};

const gameController: FastifyPluginAsync<{ prefix?: string }> = async (
	fastify: FastifyInstance,
	options
) => {
	const games: GamesManager = new GamesManager();
	fastify.get("/game/ws", { websocket: true }, (socket: WebSocket, req) => {
		const clientId = uuidv4();
		let player: PlayerCtx | undefined = undefined;
		socket.on("message", (message) => {
			const data = JSON.parse(message.toString());
			console.log(data);
			if (data.event === "stop") {
				if (!player) return;
				games.quit(socket);
				player = undefined;
			} else if (data.event === "start" && player === undefined) {
				switch (data.body.action) {
					case "play_online":
						player = {mode:"quick", playerId: games.startOnline(clientId, socket)};
						break;
					case "play_offline":
						player = {mode:"quick", playerId: games.startOffline(socket, data.body.diff)};
						break;
					case "trainbot":
						games.trainBot(socket, data.body.diff, 1000);
						break;
					case "create_tournament":
						games.createTournament

				}
			} else if (data.event === "play" && player !== undefined) {
				if (player.playerId === undefined)
					games
						.getRoom(socket)
						?.move(data.body.type, data.body.dir, data.body.id);
				else
					games
						.getRoom(socket)
						?.move(data.body.type, data.body.dir, player.playerId);
			}
		});
		socket.on("close", () => {
			console.log("close ", clientId);
			if (!player) return;
			games.quit(socket);
		});
	});
};

export default fp(gameController);
