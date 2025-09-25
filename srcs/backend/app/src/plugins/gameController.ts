import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import type { FastifyPluginAsync } from "fastify";
import GamesManager from "../pong/GamesManager.ts";

const gameController: FastifyPluginAsync<{ prefix?: string }> = async (
	fastify: FastifyInstance,
	options
) => {
	const games: GamesManager = new GamesManager();
	fastify.get("/game/ws", { websocket: true }, (socket: WebSocket, req) => {
		const clientId = uuidv4();
		let tournamentId: string | undefined = undefined;
		let local: boolean = false;
		let status: boolean = false;
		socket.on("message", (message) => {
			const data = JSON.parse(message.toString());
			console.log(data);
			if (data.event === "stop") {
				console.log("stop called");
				if (!status) return;
				console.log("debug0");
				games.quit(socket, tournamentId);
				tournamentId = undefined;
				status = false;
			} else if (data.event === "start" && status === false) {
				// console.log(data.body.action);
				switch (data.body.action) {
					case "play_online":
						games.startOnline(clientId, socket);
						break;
					case "play_offline":
						local = games.startOffline(socket, data.body.diff);
						break;
					case "trainbot":
						games.trainBot(socket, data.body.diff, 1000);
						break;
					case "create_tournament":
						games.createTournament(
							socket,
							data.body.id,
							data.body.size,
							data.body.passwd
						);
						tournamentId = data.body.id;
						break;
					case "join_tournament":
						games.joinTournament(
							socket,
							data.body.id,
							data.body.passwd
						);
						tournamentId = data.body.id;
						break;
				}
				status = true;
			} else if (data.event === "play" && status === true) {
				if (local === true)
					games
						.getRoom(socket)
						?.move(data.body.type, data.body.dir, data.body.id);
				else
					games
						.getRoom(socket)
						?.move(data.body.type, data.body.dir, socket);
			}
		});
		socket.on("close", () => {
			console.log("close ", clientId);
			if (!status) return;
			games.quit(socket, tournamentId);
		});
	});
};

export default fp(gameController);
