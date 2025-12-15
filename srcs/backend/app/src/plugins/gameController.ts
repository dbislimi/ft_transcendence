import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { Client } from "./websockets.js";
import type { FastifyPluginAsync } from "fastify";
import GamesManager from "../pong/GamesManager.js";
import { withLag } from "../utils/NetworkSimulator.js";

const gameController: FastifyPluginAsync<{ prefix?: string }> = async (
	fastify: FastifyInstance
) => {
	const games = new GamesManager();
	games.setFastifyInstance(fastify);

	fastify.get(
		"/game",
		{ websocket: true },
		async (
			connection: any,
			req: FastifyRequest<{ Querystring: { token?: string } }>
		) => {
			const socket = connection.socket || connection;
			// console.log("pong WS connected");
			const client = await fastify.getClient(req, socket);
			if (!client) {
				socket.close();
				return;
			}

			// console.log("client:", client.name);
			let local: boolean = false;
			const processInput = async (message: any) => {
				try {
					const data = JSON.parse(message.toString());
					if (!data || typeof data !== "object") return;
					// console.log(`FROM: ${client.name}`);
					// console.log(data);
					switch (data.event) {
						case "ping":
							withLag(() => {
								socket.send(
									JSON.stringify({
										event: "pong",
										to: "ping",
										body: {
											timestamp: data.body?.timestamp,
										},
									})
								);
							});
							break;
						case "set_name":
							if (client.id < 0) {
								// console.log(
								// 	`Setting guest name from ${client.name} to ${data.name}`
								// );
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
										};
									break;
								case "join":
									client.tournament = {
										tournamentId: data.body.id,
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
						case "stop":
							// console.log("stop called");
							if (data.body?.type === "offline") {
								games.stop_offline(client);
								local = false;
							} else {
								games.stop_online(client);
							}
							break;
						case "ready":
							// console.log("ready from", client.name);
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
										data.body.id,
										data.body.inputId
									);
							else
								games
									.getRoom(client)
									?.move(
										data.body.type,
										data.body.dir,
										client.inGameId,
										data.body.inputId
									);
							break;
						case "error":
							// console.log("Erreur reçue:", data);
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
			};

			socket.on("message", (message: any) => processInput(message));
			socket.on("close", () => {
				games.stop_online(client);
				client.socket = undefined;
				fastify.clients.delete(client.id);
			});
		}
	);
};

export default fp(gameController);
