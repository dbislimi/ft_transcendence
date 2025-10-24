import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type WebSocket from "ws";
import jwt from "jsonwebtoken";
import type { FastifyPluginAsync } from "fastify";
import GamesManager from "../pong/GamesManager.ts";

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

const gameController: FastifyPluginAsync<{ prefix?: string }> = async (
	fastify: FastifyInstance,
	options
) => {
	const games = new GamesManager();

	fastify.get("/game", { websocket: true }, (socket: WebSocket, req) => {
		console.log("pong WS connected");
		const client = fastify.getClient(req, socket);
		if (!client) return socket.close();
		console.log("client:", client.name);
		let local: boolean = false;
		socket.on("message", (message) => {
			const data = JSON.parse(message.toString());
			console.log(data);
			if (data.event === "stop") {
				console.log("stop called");
				games.quit(client);
				local = false;
			} else if (data.event === "start" && !games.getRoom(client)) {
				// console.log(data.body.action);
				switch (data.body.action) {
					case "list_tournaments":
						socket.send(
							JSON.stringify({
								event: "tournaments",
								body: games.listTournaments(),
							})
						);
						return;
					case "play_online":
						games.startOnline(client);
						break;
					case "play_offline":
						local = games.startOffline(client, data.body.diff);
						break;
					case "trainbot":
						games.trainBot(socket, data.body.diff, 1000);
						break;
					case "create_tournament":
						client.tournament = {
							tournamentId: data.body.id,
							allowReconnect: true,
						};
						games.createTournament(
							client,
							data.body.id,
							data.body.size,
							data.body.passwd
						);
						break;
					case "join_tournament":
						client.tournament = {
							tournamentId: data.body.id,
							allowReconnect: true,
						};
						games.joinTournament(
							client,
							data.body.id,
							data.body.passwd
						);
						break;
				}
			} else if (data.event === "play") {
				const room = games.getRoom(client);
				if (!room) return;
				if (local === true)
					games
						.getRoom(client)
						?.move(data.body.type, data.body.dir, data.body.id);
				else
					games
						.getRoom(client)
						?.move(data.body.type, data.body.dir, client.inGameId);
			}
		});
		socket.on("close", () => {
			console.log("close ", client.name);
			client.socket = undefined;
			games.quit(client);
		});
	});
};

export default fp(gameController);
