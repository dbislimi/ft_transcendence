import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type WebSocket from "ws";
import jwt from "jsonwebtoken";
import type { FastifyPluginAsync } from "fastify";
import GamesManager from "../pong/GamesManager.ts";

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

const gameController: FastifyPluginAsync<{ prefix?: string }> = async (
	fastify: FastifyInstance,
	options
) => {
	console.log("GameController plugged");
	if (!JWT_SECRET) {
		console.log(`JWT SECRET issue`);
		return;
	}
	console.log("JWT OK");
	const clients: Map<number, Client> = new Map();
	const games: GamesManager = new GamesManager();
	fastify.get("/game", { websocket: true }, (socket: WebSocket, req) => {
		console.log("WS connected");
		const { token } = req.query as { token: string };
		if (!token) {
			socket.close();
			return;
		}
		try {
			const decoded = jwt.verify(token, JWT_SECRET) as {
				id: number;
				name: string;
				email: string;
			};
			let client: Client | undefined = clients.get(decoded.id);
			if (client) {
				// Deja connecté, changement de ws
				console.log("Changement de socket");
				client.socket = socket;
			} else {
				// Nouvelle connection
				console.log("nouvelle connection");
				client = { name: decoded.name, socket };
				clients.set(decoded.id, client);
			}

			let local: boolean = false;
			// Status init to true if user currently in a tournament
			let status: boolean = client.tournament ? true : false;
			socket.on("message", (message) => {
				const data = JSON.parse(message.toString());
				console.log(data);
				if (data.event === "stop") {
					console.log("stop called");
					if (!status) return;
					games.quit(client);
					status = false;
					local = false;
				} else if (data.event === "start" && status === false) {
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
					status = true;
				} else if (data.event === "play" && status === true) {
					if (local === true)
						games
							.getRoom(client)
							?.move(data.body.type, data.body.dir, data.body.id);
					else
						games
							.getRoom(client)
							?.move(
								data.body.type,
								data.body.dir,
								client.inGameId
							);
				}
			});
			socket.on("close", () => {
				console.log("close ", decoded.name);
				client.socket = undefined;
				if (!status) return;
				games.quit(client);
			});
		} catch (e) {
			console.log(`JWT: ${e}`);
		}
	});
};

export default fp(gameController);
