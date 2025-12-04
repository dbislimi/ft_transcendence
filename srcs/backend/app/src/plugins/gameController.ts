import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { Client } from "./websockets.js";
import type { FastifyPluginAsync } from "fastify";
import GamesManager from "../pong/GamesManager.js";

const gameController: FastifyPluginAsync<{ prefix?: string }> = async (
	fastify: FastifyInstance
) => {
	const games = new GamesManager();
	games.setFastifyInstance(fastify);

	fastify.get(
		"/game",
		{ websocket: true },
		(
			connection: any,
			req: FastifyRequest<{ Querystring: { token?: string } }>
		) => {

			const socket = connection.socket || connection;
			console.log("pong WS connected");
			const client = fastify.getClient(req, socket);
			if (!client) {
				socket.close();
				return;
			}

			if (client.rejoinTimer) {
				console.log(
					`Client ${client.name} reconnected while tournament rejoin timer active`
				);
				socket.send(
					JSON.stringify({
						event: "tournament_rejoin_prompt",
						to: "tournament_rejoin_prompt",
						body: {
							tournamentId: client.tournament?.tournamentId,
							timeout: 10,
						},
					})
				);
			}
			console.log("client:", client.name);
			let local: boolean = false;
			socket.on("message", async (message: any) => {
				try {
					const data = JSON.parse(message.toString());
					if (!data || typeof data !== "object") return;
					console.log(`FROM: ${client.name}`);
					console.log(data);
					switch (data.event) {
						case "ping":
							socket.send(
								JSON.stringify({
									event: "pong",
									to: "pong",
									body: {
										timestamp: data.body?.timestamp,
									},
								})
							);
							break;
						case "set_name":
							if (client.id < 0) {
								console.log(
									`Setting guest name from ${client.name} to ${data.name}`
								);
								client.name = data.name + " (Guest)";
							}
							break;
						case "invitation": {
							const { action, invitationId, friendId, options } =
								data.body;
							if (action === "invite") {
								const friend: Client | null =
									fastify.findClientById(friendId);
								if (friend) {
									games.invite(client, friend, options);
								} else {
									socket.send(
										JSON.stringify({
											event: "invitation_error",
											to: "invitation_events",
											body: {
												reason: "friend_not_found",
											},
										})
									);
								}
								break;
							}
							games.doInvitationAction(
								action,
								client,
								invitationId
							);
							break;
						}
						case "tournament": {
							const { action } = data.body;
							switch (action) {
								case "list":
									socket.send(
										JSON.stringify({
											event: "tournaments",
											to: "pong_lobby_list",
											body: games.listTournaments(),
										})
									);
									break;
								case "create":
									if (
										games.createTournament(
											client,
											data.body.id,
											data.body.size,
											data.body.passwd,
											data.body.options
										)
									)
										client.tournament = {
											tournamentId: data.body.id,
											allowReconnect: true,
										};
									break;
								case "join":
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
							break;
						}
						case "rejoin":
							if (client.rejoinTimer)
								clearTimeout(client.rejoinTimer);
							client.rejoinTimer = undefined;
							if (data.body?.type === "tournament") {
								console.log(
									"rejoin_tournament from",
									client.name
								);
								games.handleRejoin(client);
							} else if (data.body?.type === "dismiss") {
								console.log(
									"dismiss_rejoin_prompt from",
									client.name
								);
								if (client.tournament)
									games.stop_online(client);
							}
							break;
						case "stop":
							console.log("stop called");
							if (data.body?.type === "offline") {
								games.stop_offline(client);
								local = false;
							} else {
								games.stop_online(client);
							}
							break;
						case "ready":
							console.log("ready from", client.name);
							if (data.body?.type === "player") {
								games.markPlayerReady(client);
							} else {
								if (client.winnerTimer)
									clearTimeout(client.winnerTimer);
								if (client.tournament) {
									games.playerReady(client);
								}
							}
							break;
						case "start":
							if (games.getRoom(client)) break;
							if (client.rejoinTimer) {
								clearTimeout(client.rejoinTimer);
								client.rejoinTimer = undefined;
								if (client.tournament) {
									client.tournament.allowReconnect = false;
									games.stop_online(client);
								}
							}
							switch (data.body.action) {
								case "play_online":
									games.startOnline(client);
									break;
								case "play_offline":
									local = games.startOffline(
										client,
										data.body.diff,
										data.body.options
									);
									break;
								case "trainbot":
									games.trainBot(
										socket,
										data.body.diff,
										1000
									);
									break;
							}
							break;
						case "play":
							const room = games.getRoom(client);
							if (!room) break;
							if (local === true)
								games
									.getRoom(client)
									?.move(
										data.body.type,
										data.body.dir,
										data.body.id
									);
							else
								games
									.getRoom(client)
									?.move(
										data.body.type,
										data.body.dir,
										client.inGameId
									);
							break;
						case "error":
							console.log("Erreur reçue:", data);
							break;
						default:
							break;
					}
				} catch (error) {
					console.error("Invalid JSON received:", error);
					socket.send(
						JSON.stringify({
							event: "error",
							body: { message: "Invalid JSON" },
						})
					);
				}
			});
			socket.on("close", () => {
				console.log("close ", client.name);
				games.stop_online(client);
				client.socket = undefined;
				if (client.id >= 0 && client.rejoinTimer) {
					if (client.removalTimer) clearTimeout(client.removalTimer);
					client.removalTimer = setTimeout(() => {
						const c = fastify.clients.get(client.id);
						if (c && !c.socket) {
							console.log(
								`Removing client ${c.name} (id=${client.id}) after reconnect timeout`
							);
							fastify.clients.delete(client.id);
						}
					}, 12000);
				} else {
					console.log(
						`Removing client ${client.name} (id=${client.id}) on disconnect`
					);
					fastify.clients.delete(client.id);
				}
			});
		}
	);
};

export default fp(gameController);
