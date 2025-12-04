import type { FastifyPluginAsync } from "fastify";
import jwt from "jsonwebtoken";

interface FriendEvent {
	type: string;
	from?: number;
	to?: number;
	display_name?: string;
	avatar?: string;
	userId?: number;
	online?: boolean;
}

const SECRET = process.env.JWT_SECRET || "changeme";

let globalActiveConnections = new Map<number, any>();

export function broadcastToUsers(message: FriendEvent, userIds: number[]) {
	userIds.forEach((userId) => {
		const connection = globalActiveConnections.get(userId);
		if (connection && connection.readyState === 1) {
			try {
				connection.send(JSON.stringify(message));
			} catch (error) {
				globalActiveConnections.delete(userId);
			}
		}
	});
}

const wsFriends: FastifyPluginAsync = async (fastify) => {
	fastify.get(
		"/ws-friends",
		{ websocket: true },
		(connection: any, request) => {
			const socket = connection.socket || connection;
			const token = (request.query as any).token;

			if (!token) {
				socket.close(1008, "Token manquant");
				return;
			}

			try {
				const decoded = jwt.verify(token, SECRET) as any;
				const userId = decoded.id;

				globalActiveConnections.set(userId, socket);

				fastify.db.run(
					"UPDATE users SET online = 1 WHERE id = ?",
					[userId],
					(err: any) => {
						if (!err) {
							fastify.db.all(
								"SELECT friend_id FROM friends WHERE user_id = ?",
								[userId],
								(err: any, friends: any[]) => {
									if (!err && friends.length > 0) {
										const friendIds = friends.map(
											(f) => f.friend_id
										);
										broadcastToUsers(
											{
												type: "status_update",
												userId: userId,
												online: true,
											},
											friendIds
										);
									}
								}
							);
						}
					}
				);

				socket.send(
					JSON.stringify({
						type: "connected",
						message: "Connecté au système d'amis",
					})
				);

				socket.on("message", (message: Buffer) => {
					try {
						const data = JSON.parse(message.toString());

						if (data.type === "pong") {
							return;
						}
					} catch (error) {}
				});

				socket.on("close", () => {
					globalActiveConnections.delete(userId);

					fastify.db.run(
						"UPDATE users SET online = 0 WHERE id = ?",
						[userId],
						(err: any) => {
							if (!err) {
								fastify.db.all(
									"SELECT friend_id FROM friends WHERE user_id = ?",
									[userId],
									(err: any, friends: any[]) => {
										if (!err && friends.length > 0) {
											const friendIds = friends.map(
												(f) => f.friend_id
											);
											broadcastToUsers(
												{
													type: "status_update",
													userId: userId,
													online: false,
												},
												friendIds
											);
										}
									}
								);
							}
						}
					);
				});

				socket.on("error", () => {
					globalActiveConnections.delete(userId);

					fastify.db.run(
						"UPDATE users SET online = 0 WHERE id = ?",
						[userId],
						(err: any) => {
							if (!err) {
								fastify.db.all(
									"SELECT friend_id FROM friends WHERE user_id = ?",
									[userId],
									(err: any, friends: any[]) => {
										if (!err && friends.length > 0) {
											const friendIds = friends.map(
												(f) => f.friend_id
											);
											broadcastToUsers(
												{
													type: "status_update",
													userId: userId,
													online: false,
												},
												friendIds
											);
										}
									}
								);
							}
						}
					);
				});
			} catch (error) {
				socket.close(1008, "Token invalide");
			}
		}
	);

	setInterval(() => {
		globalActiveConnections.forEach((connection, userId) => {
			if (connection && connection.readyState === 1) {
				try {
					connection.send(JSON.stringify({ type: "heartbeat" }));
				} catch (error) {
					globalActiveConnections.delete(userId);

					fastify.db.run(
						"UPDATE users SET online = 0 WHERE id = ?",
						[userId],
						(err: any) => {
							if (!err) {
								fastify.db.all(
									"SELECT friend_id FROM friends WHERE user_id = ?",
									[userId],
									(err: any, friends: any[]) => {
										if (!err && friends.length > 0) {
											const friendIds = friends.map(
												(f) => f.friend_id
											);
											broadcastToUsers(
												{
													type: "status_update",
													userId: userId,
													online: false,
												},
												friendIds
											);
										}
									}
								);
							}
						}
					);
				}
			} else {
				globalActiveConnections.delete(userId);

				fastify.db.run(
					"UPDATE users SET online = 0 WHERE id = ?",
					[userId],
					(err: any) => {
						if (!err) {
							fastify.db.all(
								"SELECT friend_id FROM friends WHERE user_id = ?",
								[userId],
								(err: any, friends: any[]) => {
									if (!err && friends.length > 0) {
										const friendIds = friends.map(
											(f) => f.friend_id
										);
										broadcastToUsers(
											{
												type: "status_update",
												userId: userId,
												online: false,
											},
											friendIds
										);
									}
								}
							);
						}
					}
				);
			}
		});
	}, 15000);
};

export default wsFriends;
