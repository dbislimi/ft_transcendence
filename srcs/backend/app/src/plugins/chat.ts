import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import WebSocket from "ws";
import { AsyncLock } from "../utils/AsyncLock.js";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
	throw new Error("JWT_SECRET must be defined in environment variables");
}

interface Client {
	id: number;
	name: string;
	socket: WebSocket;
}

const clients: Client[] = [];
const clientsLock = new AsyncLock();

export async function sendTournamentMessage(
	playerIds: (number | undefined)[],
	message: string
) {
	const ids = playerIds.filter(Boolean) as number[];

	const payload = {
		type: "info",
		message,
		date: new Date().toISOString(),
	};

	const snapshot = await clientsLock.acquire(() => [...clients]);

	for (const c of snapshot) {
		if (ids.includes(c.id) && c.socket.readyState === 1) {
			try {
				c.socket.send(JSON.stringify(payload));
			} catch (err) {
				console.error("Erreur envoi WS tournoi :", err);
			}
		}
	}
}

export default fp(async function Chat(fastify: FastifyInstance) {
	async function isBlocked(
		blockerId: number,
		senderId: number
	): Promise<boolean> {
		return new Promise((resolve, reject) => {
			fastify.db.get(
				"SELECT 1 FROM blocks WHERE blockerId = ? AND blockedId = ?",
				[blockerId, senderId],
				(err, row) => {
					if (err) reject(err);
					else resolve(!!row);
				}
			);
		});
	}

	async function getBlockedIds(blockerId: number): Promise<number[]> {
		return new Promise((resolve, reject) => {
			fastify.db.all(
				"SELECT blockedId FROM blocks WHERE blockerId = ?",
				[blockerId],
				(err, rows: { blockedId: number }[]) => {
					if (err) reject(err);
					else resolve(rows.map((r) => r.blockedId));
				}
			);
		});
	}
	async function getBlockers(blockedId: number): Promise<number[]> {
		return new Promise((resolve, reject) => {
			fastify.db.all(
				"SELECT blockerId FROM blocks WHERE blockedId = ?",
				[blockedId],
				(err, rows: { blockerId: number }[]) => {
					if (err) reject(err);
					else resolve(rows.map((r) => r.blockerId));
				}
			);
		});
	}
	function sendToClient(client: Client, data: any) {
		try {
			if (client.socket.readyState === 1) {
				client.socket.send(JSON.stringify(data));
			}
		} catch (err) {
			fastify.log.error({ err }, "Erreur envoi WS:");
		}
	}

	async function broadcastUsers() {
		const snapshot = await clientsLock.acquire(() => [...clients]);
		const allUsers = Array.from(
			new Map(snapshot.map((c) => [c.id, { id: c.id, name: c.name }])).values()
		);

		fastify.log.info(
			`[Chat] Broadcasting ${allUsers.length} users to ${snapshot.length} clients`
		);

		for (const client of snapshot) {
			if (client.socket.readyState !== 1) continue;

			try {
				const blockedIds = await getBlockedIds(client.id);

				const usersForThisClient = allUsers.map((user) => ({
					...user,
					blocked: blockedIds.includes(user.id),
				}));

				fastify.log.info(
					`[Chat] Envoi à ${client.name}: ${JSON.stringify(usersForThisClient)}`
				);
				sendToClient(client, { type: "users", users: usersForThisClient });
			} catch (err) {
				fastify.log.error(
					{ err },
					`Erreur broadcastUsers pour ${client.name}:`
				);
			}
		}
	}

	fastify.get("/chat", { websocket: true }, (socket, req) => {
		const { token } = req.query as { token?: string };
		if (!token) {
			socket.close();
			return;
		}

		try {
			const decoded = jwt.verify(token, JWT_SECRET) as {
				id: number;
				display_name: string;
				email: string;
			};
			const client: Client = {
				id: decoded.id,
				name: decoded.display_name,
				socket,
			};

			clientsLock
				.acquire(() => {
					clients.push(client);
				})
				.then(() => {
					fastify.log.info(
						`${client.name} connecte (${clients.length} clients)`
					);
					broadcastUsers();
				});

			// Reception de message
			socket.on("message", async (raw: Buffer) => {
				try {
					const data = JSON.parse(raw.toString());

					if (data.type === "message") {
						const msg = {
							from: { id: client.id, name: client.name },
							to: data.to || null,
							text: data.text,
							date: new Date().toISOString(),
						};

						fastify.db.run(
							"INSERT INTO messages (fromId, toId, text, date) VALUES (?, ?, ?, ?)",
							[msg.from.id, msg.to, msg.text, msg.date]
						);

						const snapshot = await clientsLock.acquire(() => [...clients]);

						if (msg.to) {
							// Message prive
							const targets = snapshot.filter((c) => c.id === msg.to);
							for (const t of targets) {
								if (!(await isBlocked(t.id, client.id))) {
									sendToClient(t, { type: "private", ...msg });
								}
							}
							sendToClient(client, { type: "private", ...msg });
						} else {
							// Optimisation: Recuperer tous ceux qui m'ont bloque en une seule requête
							const blockers = await getBlockers(client.id);

							for (const c of snapshot) {
								if (blockers.includes(c.id)) continue;
								sendToClient(c, { type: "global", ...msg });
							}
						}
					}

					if (data.type === "block") {
						fastify.db.run(
							"INSERT OR IGNORE INTO blocks (blockerId, blockedId) VALUES (?, ?)",
							[client.id, data.userId],
							(err) => {
								if (err) return fastify.log.error({ err }, "Erreur DB block:");
								sendToClient(client, {
									type: "info",
									message: ` ${data.name} bloqué`,
								});
								// Rediffuser la liste des utilisateurs pour que le statut "bloque" soit à jour
								broadcastUsers();
							}
						);
					}

					if (data.type === "unblock") {
						fastify.db.run(
							"DELETE FROM blocks WHERE blockerId = ? AND blockedId = ?",
							[client.id, data.userId],
							(err) => {
								if (err)
									return fastify.log.error({ err }, "Erreur DB unblock:");
								sendToClient(client, {
									type: "info",
									message: ` ${data.name} débloqué`,
								});
								// Rediffuser la liste des utilisateurs
								broadcastUsers();
							}
						);
					}
				} catch (err) {
					fastify.log.error({ err }, "Erreur message WS :");
				}
			});

			socket.on("close", async () => {
				await clientsLock.acquire(() => {
					const index = clients.findIndex((c: Client) => c.socket === socket);
					if (index !== -1) {
						const [removedClient] = clients.splice(index, 1);
						fastify.log.info(
							`${removedClient.name} deconnecte (${clients.length} restants)`
						);
					} else {
						fastify.log.info(`Client inconnu deconnecte`);
					}
				});
				broadcastUsers();
			});
		} catch (err) {
			fastify.log.error({ err }, "JWT invalide :");
			socket.close();
		}
	});
});
