import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { Client } from "./websockets.ts";
import type { FastifyPluginAsync } from "fastify";
import GamesManager from "../pong/GamesManager.ts";

const gameController: FastifyPluginAsync<{ prefix?: string }> = async (
	fastify: FastifyInstance
) => {
	const games = new GamesManager();
	games.setFastifyInstance(fastify);

	fastify.get(
		"/game",
		{ websocket: true },
		(
			socket: any,
			req: FastifyRequest<{ Querystring: { token?: string } }>
		) => {
			console.log("pong WS connected");
			const client = fastify.getClient(req, socket);
			if (!client) return socket.close();

			if (!client.cosmetics) {
				fastify.db.get(
					`SELECT preferred_side, paddle_color, ball_color FROM users WHERE id = ?`,
					[client.id],
					(err: any, row: any) => {
						if (!err && row) {
							client.cosmetics = {
								preferredSide: row.preferred_side || "left",
								paddleColor: row.paddle_color || "#FFFFFF",
								ballColor: row.ball_color || "#FFFFFF",
							};
						} else {
							client.cosmetics = {
								preferredSide: "left",
								paddleColor: "#FFFFFF",
								ballColor: "#FFFFFF",
							};
						}
					}
				);
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
				const data = JSON.parse(message.toString());
				console.log(`FROM: ${client.name}`);
				console.log(data);
				switch (data.event) {
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
										body: { reason: "friend_not_found" },
									})
								);
							}
							break;
						}
						games.doInvitationAction(action, client, invitationId);
						break;
					}
					case "tournament": {
						const { action } = data.body;
						switch (action) {
							case "list":
								socket.send(
									JSON.stringify({
										event: "tournaments",
										to: "online_card",
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
							console.log("rejoin_tournament from", client.name);
							games.handleRejoin(client);
						} else if (data.body?.type === "dismiss") {
							console.log(
								"dismiss_rejoin_prompt from",
								client.name
							);
							if (client.tournament) games.stop_online(client);
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
								games.trainBot(socket, data.body.diff, 1000);
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
					case "update_cosmetics":
						const { preferredSide, paddleColor, ballColor } =
							data.body;
						const newCosmetics = {
							preferredSide,
							paddleColor,
							ballColor,
						};

						const currentCosmetics = client.cosmetics || {
							preferredSide: "left",
							paddleColor: "#ffffff",
							ballColor: "#ff0000",
						};

						const hasChanged =
							currentCosmetics.preferredSide !==
								newCosmetics.preferredSide ||
							currentCosmetics.paddleColor !==
								newCosmetics.paddleColor ||
							currentCosmetics.ballColor !==
								newCosmetics.ballColor;

						if (!hasChanged) return;
						client.cosmetics = newCosmetics;
						fastify.db.run(
							`UPDATE users SET preferred_side = ?, paddle_color = ?, ball_color = ? WHERE id = ?`,
							[preferredSide, paddleColor, ballColor, client.id],
							function (updateErr: any) {
								if (updateErr) {
									console.error(
										"Erreur lors de la mise à jour des cosmetics:",
										updateErr
									);
								} else {
									console.log(
										`Cosmetics updated for user ${client.name}`
									);
								}
							}
						);
						break;
					default:
						break;
				}
			});
			socket.on("close", () => {
				console.log("close ", client.name);
				games.stop_online(client);
				client.socket = undefined;
				if (client.rejoinTimer) {
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
