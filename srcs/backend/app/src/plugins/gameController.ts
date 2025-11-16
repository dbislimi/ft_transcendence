import fp from "fastify-plugin";
import type WebSocket from "ws";
import GamesManager from "../pong/GamesManager.ts";

interface Tournament {
	tournamentId: string;
	allowReconnect: boolean;
}
export interface Client {
	id: number;
	name: string;
	socket?: WebSocket;
	tournament?: Tournament;
	inGameId?: 0 | 1;

	quit?: boolean;
	winnerTimer?: ReturnType<typeof setTimeout>;

	rejoinTimer?: ReturnType<typeof setTimeout>;
	removalTimer?: ReturnType<typeof setTimeout>;
}

const gameController = async (fastify: any, options: any) => {
	const games = new GamesManager();

	fastify.get("/game/ws", { websocket: true }, (socket: WebSocket, req: any) => {
		console.log("pong WS connected");
		let client = fastify.getClient(req, socket);
		
		// fallback offline si pas d'auth
		if (!client) {
			console.log("pong WS: No authenticated client, creating temporary client for offline mode");
			const tempId = Math.floor(Math.random() * 1000000); // ID temporaire
			client = {
				id: tempId,
				name: `Guest_${tempId}`,
				socket
			} as Client;
			fastify.clients.set(tempId, client);
		}

		if (client.rejoinTimer) {
			console.log(`Client ${client.name} reconnected while tournament rejoin timer active`);
			socket.send(JSON.stringify({ event: "tournament_rejoin_prompt", body: { tournamentId: client.tournament?.tournamentId, timeout: 10 } }));
		}
		console.log("client:", client.name);
		let local: boolean = false;
		socket.on("message", (message) => {
			const data = JSON.parse(message.toString());
			console.log(`FROM: ${client.name}`);
			console.log(data);
			if (data.event === "stop_offline") {
				console.log("stop_offline called");
				games.stop_offline(client);
				local = false;
			} else if (data.event === "rejoin_tournament") {
				if (client.rejoinTimer) clearTimeout(client.rejoinTimer);
				console.log("rejoin_tournament from", client.name);
				games.handleRejoin(client);
			} else if (data.event === "stop_online") {
				console.log("stop_online called");
				games.stop_online(client);
			} else if (data.event === "ready") {
				if (client.winnerTimer) clearTimeout(client.winnerTimer);
				console.log("client ready for next tournament round", client.name);
				games.playerReady(client);
			} else if (data.event === "start") {
				const action = data.body?.action as string | undefined;
				switch (action) {
					case "list_tournaments":
						socket.send(JSON.stringify({ event: "tournaments", body: games.listTournaments() }));
						return;
					case "play_online":
						games.stop_online(client);
						games.startOnline(client);
						break;
					case "play_offline":
						// Clear any lingering online state before starting local/offline
						games.stop_online(client);
						local = games.startOffline(client, data.body.diff);
						break;
					case "trainbot":
						games.trainBot(socket, data.body.diff, 1000);
						break;
					case "create_tournament":
						if (games.createTournament(client, data.body.id, data.body.size, data.body.passwd))
							client.tournament = { tournamentId: data.body.id, allowReconnect: true };
						break;
					case "join_tournament":
						client.tournament = { tournamentId: data.body.id, allowReconnect: true };
						games.joinTournament(client, data.body.id, data.body.passwd);
						break;
					default:
						console.warn("Unknown start action:", action);
						break;
				}
			} else if (data.event === "play") {
				const room = games.getRoom(client);
				if (!room) return;
				if (local === true) games.getRoom(client)?.move(data.body.type, data.body.dir, data.body.id);
				else games.getRoom(client)?.move(data.body.type, data.body.dir, client.inGameId);
			}
		});
		socket.on("close", () => {
			console.log("close ", client.name);
			client.socket = undefined;
			games.stop_online(client);
			if (client.tournament && client.tournament.allowReconnect) {
				if (client.removalTimer) clearTimeout(client.removalTimer);
				client.removalTimer = setTimeout(() => {
					const c = fastify.clients.get(client.id);
					if (c && !c.socket) {
						console.log(`Removing client ${c.name} (id=${client.id}) after reconnect timeout`);
						fastify.clients.delete(client.id);
					}
				}, 12000);
			} else {
				console.log(`Removing client ${client.name} (id=${client.id}) on disconnect`);
				fastify.clients.delete(client.id);
			}
		});
		});
	};

	export default fp(gameController);
