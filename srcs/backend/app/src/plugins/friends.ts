import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { verifyToken } from "../utils/auth.ts";
import { broadcastToUsers } from "./ws-friends.ts";

export default fp(async function friendsPlugin(fastify: FastifyInstance) {
	fastify.get("/friends", async (request, reply) => {
		const decoded = verifyToken(request, reply);
		if (!decoded) {
			return reply
				.code(401)
				.send({ error: "Token invalide ou manquant" });
		}

		return new Promise((resolve) => {
			fastify.db.all(
				`SELECT u.id, u.display_name, u.avatar, u.online
         FROM friends f
         JOIN users u ON u.id = f.friend_id
         WHERE f.user_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM blocked_users b 
           WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
           OR (b.blocker_id = u.id AND b.blocked_id = ?)
         )
         ORDER BY u.online DESC, u.display_name ASC`,
				[decoded.id, decoded.id, decoded.id],
				(err: any, rows: any[]) => {
					if (err) {
						reply.code(500).send({ error: "Erreur serveur" });
					} else {
						reply.send(rows);
					}
					resolve();
				}
			);
		});
	});

	fastify.get("/friend-requests", async (request, reply) => {
		const decoded = verifyToken(request, reply);
		if (!decoded) {
			return reply
				.code(401)
				.send({ error: "Token invalide ou manquant" });
		}

		return new Promise((resolve) => {
			fastify.db.all(
				`SELECT fr.sender_id, u.display_name, u.avatar, fr.status, 'received' as type
         FROM friend_requests fr
         JOIN users u ON u.id = fr.sender_id
         WHERE fr.receiver_id = ? AND fr.status = 'pending'
         AND NOT EXISTS (
           SELECT 1 FROM blocked_users b 
           WHERE (b.blocker_id = ? AND b.blocked_id = fr.sender_id)
           OR (b.blocker_id = fr.sender_id AND b.blocked_id = ?)
         )
         ORDER BY fr.created_at DESC`,
				[decoded.id, decoded.id, decoded.id],
				(err1: any, received: any[]) => {
					if (err1) {
						reply.code(500).send({ error: "Erreur serveur" });
						resolve();
						return;
					}

					fastify.db.all(
						`SELECT fr.receiver_id as sender_id, u.display_name, u.avatar, fr.status, 'sent' as type
             FROM friend_requests fr
             JOIN users u ON u.id = fr.receiver_id
             WHERE fr.sender_id = ? AND fr.status = 'pending'
             AND NOT EXISTS (
               SELECT 1 FROM blocked_users b 
               WHERE (b.blocker_id = ? AND b.blocked_id = fr.receiver_id)
               OR (b.blocker_id = fr.receiver_id AND b.blocked_id = ?)
             )
             ORDER BY fr.created_at DESC`,
						[decoded.id, decoded.id, decoded.id],
						(err2: any, sent: any[]) => {
							if (err2) {
								reply
									.code(500)
									.send({ error: "Erreur serveur" });
							} else {
								reply.send([...received, ...sent]);
							}
							resolve();
						}
					);
				}
			);
		});
	});

	fastify.get("/blocked-users", async (request, reply) => {
		const decoded = verifyToken(request, reply);
		if (!decoded) {
			return reply
				.code(401)
				.send({ error: "Token invalide ou manquant" });
		}

		return new Promise((resolve) => {
			fastify.db.all(
				`SELECT u.id, u.display_name, u.avatar, b.created_at
         FROM blocked_users b
         JOIN users u ON u.id = b.blocked_id
         WHERE b.blocker_id = ?
         ORDER BY b.created_at DESC`,
				[decoded.id],
				(err: any, rows: any[]) => {
					if (err) {
						reply.code(500).send({ error: "Erreur serveur" });
					} else {
						reply.send(rows);
					}
					resolve();
				}
			);
		});
	});

	fastify.post(
		"/friend-requests",
		{
			schema: {
				body: {
					type: "object",
					required: ["display_name"],
					properties: {
						display_name: { type: "string" },
					},
				},
			},
		},
		async (request, reply) => {
			try {
				const decoded = verifyToken(request, reply);
				if (!decoded) {
					return reply
						.code(401)
						.send({ error: "Token invalide ou manquant" });
				}

				const { display_name } = request.body as any;

				if (!display_name?.trim()) {
					return reply
						.code(400)
						.send({ error: "Nom d'utilisateur requis" });
				}

				return new Promise<void>((resolve, reject) => {
					fastify.db.serialize(() => {
						fastify.db.run("BEGIN IMMEDIATE TRANSACTION");

						fastify.db.get(
							"SELECT id, display_name, avatar FROM users WHERE display_name = ?",
							[display_name.trim()],
							(err: any, friend: any) => {
								if (err) {
									fastify.db.run("ROLLBACK");
									reject(err);
									return;
								}

								if (!friend) {
									fastify.db.run("ROLLBACK");
									reply.code(404).send({
										error: "Utilisateur introuvable",
									});
									resolve();
									return;
								}

								if (friend.id === decoded.id) {
									fastify.db.run("ROLLBACK");
									reply.code(400).send({
										error: "Impossible de s'ajouter soi-même",
									});
									resolve();
									return;
								}

								fastify.db.get(
									`SELECT 1 FROM blocked_users WHERE 
                 (blocker_id = ? AND blocked_id = ?) OR 
                 (blocker_id = ? AND blocked_id = ?)`,
									[
										decoded.id,
										friend.id,
										friend.id,
										decoded.id,
									],
									(err: any, isBlocked: any) => {
										if (err) {
											fastify.db.run("ROLLBACK");
											reject(err);
											return;
										}

										if (isBlocked) {
											fastify.db.run("ROLLBACK");
											reply.code(403).send({
												error: "Impossible d'envoyer une demande à cet utilisateur",
											});
											resolve();
											return;
										}

										fastify.db.get(
											"SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?",
											[decoded.id, friend.id],
											(err: any, areFriends: any) => {
												if (err) {
													fastify.db.run("ROLLBACK");
													reject(err);
													return;
												}

												if (areFriends) {
													fastify.db.run("ROLLBACK");
													reply.code(400).send({
														error: "Vous êtes dejà amis",
													});
													resolve();
													return;
												}

												fastify.db.get(
													"SELECT * FROM friend_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = 'pending'",
													[
														decoded.id,
														friend.id,
														friend.id,
														decoded.id,
													],
													(
														err: any,
														pendingRequest: any
													) => {
														if (err) {
															fastify.db.run(
																"ROLLBACK"
															);
															reject(err);
															return;
														}

														if (pendingRequest) {
															fastify.db.run(
																"ROLLBACK"
															);
															if (
																pendingRequest.sender_id ===
																decoded.id
															) {
																reply
																	.code(400)
																	.send({
																		error: "Demande dejà envoyee",
																	});
															} else {
																reply
																	.code(400)
																	.send({
																		error: "Cet utilisateur vous a dejà envoye une demande",
																	});
															}
															resolve();
															return;
														}

														fastify.db.run(
															"DELETE FROM friend_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status != 'pending'",
															[
																decoded.id,
																friend.id,
																friend.id,
																decoded.id,
															],
															(err: any) => {
																if (err) {
																	fastify.db.run(
																		"ROLLBACK"
																	);
																	reject(err);
																	return;
																}

																fastify.db.run(
																	"INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (?, ?, 'pending')",
																	[
																		decoded.id,
																		friend.id,
																	],
																	(
																		err: any
																	) => {
																		if (
																			err
																		) {
																			fastify.db.run(
																				"ROLLBACK"
																			);
																			reject(
																				err
																			);
																			return;
																		}

																		fastify.db.run(
																			"COMMIT",
																			(
																				err: any
																			) => {
																				if (
																					err
																				) {
																					fastify.db.run(
																						"ROLLBACK"
																					);
																					reject(
																						err
																					);
																					return;
																				}

																				// Broadcast outside transaction (best effort)
																				fastify.db.get(
																					"SELECT display_name, avatar FROM users WHERE id = ?",
																					[
																						decoded.id,
																					],
																					(
																						err: any,
																						senderInfo: any
																					) => {
																						if (
																							!err &&
																							senderInfo
																						) {
																							broadcastToUsers(
																								{
																									type: "friend_request_received",
																									from: decoded.id,
																									display_name:
																										senderInfo.display_name,
																									avatar: senderInfo.avatar,
																								},
																								[
																									friend.id,
																								]
																							);
																						}
																					}
																				);

																				reply.send(
																					{
																						message:
																							"Demande d'ami envoyee avec succes",
																					}
																				);
																				resolve();
																			}
																		);
																	}
																);
															}
														);
													}
												);
											}
										);
									}
								);
							}
						);
					});
				});
			} catch (error) {
				return reply.code(500).send({ error: "Erreur serveur" });
			}
		}
	);

	fastify.post("/friend-requests/:id/accept", async (request, reply) => {
		try {
			const decoded = verifyToken(request, reply);
			if (!decoded) {
				return reply
					.code(401)
					.send({ error: "Token invalide ou manquant" });
			}

			const { id } = request.params as any;
			const senderId = parseInt(id);

			if (isNaN(senderId)) {
				return reply.code(400).send({ error: "ID demande invalide" });
			}

			return new Promise<void>((resolve, reject) => {
				fastify.db.serialize(() => {
					fastify.db.run("BEGIN IMMEDIATE TRANSACTION");

					fastify.db.get(
						`SELECT 1 FROM blocked_users WHERE
             (blocker_id = ? AND blocked_id = ?) OR
             (blocker_id = ? AND blocked_id = ?)`,
						[decoded.id, senderId, senderId, decoded.id],
						(err: any, isBlocked: any) => {
							if (err) {
								fastify.db.run("ROLLBACK");
								reject(err);
								return;
							}

							if (isBlocked) {
								fastify.db.run("ROLLBACK");
								reply.code(403).send({
									error: "Impossible d'accepter cette demande",
								});
								resolve();
								return;
							}

							fastify.db.get(
								"SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'",
								[senderId, decoded.id],
								(err: any, req: any) => {
									if (err) {
										fastify.db.run("ROLLBACK");
										reject(err);
										return;
									}

									if (!req) {
										fastify.db.run("ROLLBACK");
										reply.code(404).send({
											error: "Demande introuvable",
										});
										resolve();
										return;
									}

									fastify.db.run(
										"UPDATE friend_requests SET status = 'accepted' WHERE sender_id = ? AND receiver_id = ?",
										[senderId, decoded.id],
										(err: any) => {
											if (err) {
												fastify.db.run("ROLLBACK");
												reject(err);
												return;
											}

											fastify.db.run(
												"INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)",
												[decoded.id, senderId],
												(err: any) => {
													if (err) {
														fastify.db.run(
															"ROLLBACK"
														);
														reject(err);
														return;
													}

													fastify.db.run(
														"INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)",
														[senderId, decoded.id],
														(err: any) => {
															if (err) {
																fastify.db.run(
																	"ROLLBACK"
																);
																reject(err);
																return;
															}

															fastify.db.run(
																"COMMIT",
																(err: any) => {
																	if (err) {
																		fastify.db.run(
																			"ROLLBACK"
																		);
																		reject(
																			err
																		);
																		return;
																	}

																	// Broadcast outside transaction
																	fastify.db.get(
																		"SELECT display_name, avatar FROM users WHERE id = ?",
																		[
																			decoded.id,
																		],
																		(
																			err: any,
																			accepterInfo: any
																		) => {
																			if (
																				!err &&
																				accepterInfo
																			) {
																				broadcastToUsers(
																					{
																						type: "friend_request_accepted",
																						from: decoded.id,
																						display_name:
																							accepterInfo.display_name,
																						avatar: accepterInfo.avatar,
																					},
																					[
																						senderId,
																					]
																				);
																			}
																		}
																	);

																	reply.send({
																		message:
																			"Demande acceptee",
																	});
																	resolve();
																}
															);
														}
													);
												}
											);
										}
									);
								}
							);
						}
					);
				});
			});
		} catch (error) {
			return reply.code(500).send({ error: "Erreur serveur" });
		}
	});

	fastify.post("/friend-requests/:id/reject", async (request, reply) => {
		try {
			const decoded = verifyToken(request, reply);
			if (!decoded) {
				return reply
					.code(401)
					.send({ error: "Token invalide ou manquant" });
			}

			const { id } = request.params as any;
			const senderId = parseInt(id);

			if (isNaN(senderId)) {
				return reply.code(400).send({ error: "ID demande invalide" });
			}

			const updated = await new Promise<number>((resolve, reject) => {
				fastify.db.run(
					"UPDATE friend_requests SET status = 'rejected' WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'",
					[senderId, decoded.id],
					function (err: any) {
						if (err) reject(err);
						else resolve(this.changes);
					}
				);
			});

			if (updated === 0) {
				return reply.code(404).send({ error: "Demande introuvable" });
			}

			try {
				const rejecterInfo = await new Promise<any>(
					(resolve, reject) => {
						fastify.db.get(
							"SELECT display_name, avatar FROM users WHERE id = ?",
							[decoded.id],
							(err: any, row: any) => {
								if (err) reject(err);
								else resolve(row);
							}
						);
					}
				);

				broadcastToUsers(
					{
						type: "friend_request_rejected",
						from: decoded.id,
						display_name: rejecterInfo.display_name,
						avatar: rejecterInfo.avatar,
					},
					[senderId]
				);
			} catch (err) {}

			return reply.send({ message: "Demande rejetee" });
		} catch (error) {
			return reply.code(500).send({ error: "Erreur serveur" });
		}
	});

	fastify.delete("/friends/:id", async (request, reply) => {
		try {
			const decoded = verifyToken(request, reply);
			if (!decoded) {
				return reply
					.code(401)
					.send({ error: "Token invalide ou manquant" });
			}

			const { id } = request.params as any;
			const friendId = parseInt(id);

			if (isNaN(friendId)) {
				return reply.code(400).send({ error: "ID ami invalide" });
			}

			await new Promise<void>((resolve, reject) => {
				fastify.db.serialize(() => {
					fastify.db.run("BEGIN IMMEDIATE TRANSACTION");

					fastify.db.run(
						"DELETE FROM friends WHERE user_id = ? AND friend_id = ?",
						[decoded.id, friendId]
					);

					fastify.db.run(
						"DELETE FROM friends WHERE user_id = ? AND friend_id = ?",
						[friendId, decoded.id]
					);

					fastify.db.run("COMMIT", (err: any) => {
						if (err) {
							fastify.db.run("ROLLBACK");
							reject(err);
						} else {
							resolve();
						}
					});
				});
			});

			try {
				const removerInfo = await new Promise<any>(
					(resolve, reject) => {
						fastify.db.get(
							"SELECT display_name, avatar FROM users WHERE id = ?",
							[decoded.id],
							(err: any, row: any) => {
								if (err) reject(err);
								else resolve(row);
							}
						);
					}
				);

				broadcastToUsers(
					{
						type: "friend_removed",
						from: decoded.id,
						display_name: removerInfo.display_name,
						avatar: removerInfo.avatar,
					},
					[friendId]
				);
			} catch (err) {}

			return reply.send({ message: "Ami supprime" });
		} catch (error) {
			return reply.code(500).send({ error: "Erreur serveur" });
		}
	});

	fastify.post(
		"/block-user",
		{
			schema: {
				body: {
					type: "object",
					required: ["user_id"],
					properties: {
						user_id: { type: "number" },
					},
				},
			},
		},
		async (request, reply) => {
			try {
				const decoded = verifyToken(request, reply);
				if (!decoded) {
					return reply
						.code(401)
						.send({ error: "Token invalide ou manquant" });
				}

				const { user_id } = request.body as any;

				if (!user_id || user_id === decoded.id) {
					return reply
						.code(400)
						.send({ error: "ID utilisateur invalide" });
				}

				const userExists = await new Promise<any>((resolve, reject) => {
					fastify.db.get(
						"SELECT 1 FROM users WHERE id = ?",
						[user_id],
						(err: any, row: any) => {
							if (err) reject(err);
							else resolve(row);
						}
					);
				});

				if (!userExists) {
					return reply
						.code(404)
						.send({ error: "Utilisateur introuvable" });
				}

				await new Promise<void>((resolve, reject) => {
					fastify.db.serialize(() => {
						fastify.db.run("BEGIN IMMEDIATE TRANSACTION");

						fastify.db.run(
							"INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)",
							[decoded.id, user_id]
						);

						fastify.db.run(
							"DELETE FROM friends WHERE user_id = ? AND friend_id = ?",
							[decoded.id, user_id]
						);

						fastify.db.run(
							"DELETE FROM friends WHERE user_id = ? AND friend_id = ?",
							[user_id, decoded.id]
						);

						fastify.db.run(
							"DELETE FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
							[decoded.id, user_id, user_id, decoded.id]
						);

						fastify.db.run("COMMIT", (err: any) => {
							if (err) {
								fastify.db.run("ROLLBACK");
								reject(err);
							} else {
								resolve();
							}
						});
					});
				});

				try {
					const blockerInfo = await new Promise<any>(
						(resolve, reject) => {
							fastify.db.get(
								"SELECT display_name, avatar FROM users WHERE id = ?",
								[decoded.id],
								(err: any, row: any) => {
									if (err) reject(err);
									else resolve(row);
								}
							);
						}
					);

					broadcastToUsers(
						{
							type: "user_blocked",
							from: decoded.id,
							display_name: blockerInfo.display_name,
							avatar: blockerInfo.avatar,
						},
						[user_id]
					);
				} catch (err) {}

				return reply.send({
					message: "Utilisateur bloque avec succes",
				});
			} catch (error) {
				return reply.code(500).send({ error: "Erreur serveur" });
			}
		}
	);

	fastify.delete("/blocked-users/:id", async (request, reply) => {
		try {
			const decoded = verifyToken(request, reply);
			if (!decoded) {
				return reply
					.code(401)
					.send({ error: "Token invalide ou manquant" });
			}

			const { id } = request.params as any;
			const blockedId = parseInt(id);

			if (isNaN(blockedId)) {
				return reply
					.code(400)
					.send({ error: "ID utilisateur invalide" });
			}

			const deleted = await new Promise<number>((resolve, reject) => {
				fastify.db.run(
					"DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?",
					[decoded.id, blockedId],
					function (err: any) {
						if (err) reject(err);
						else resolve(this.changes);
					}
				);
			});

			if (deleted === 0) {
				return reply
					.code(404)
					.send({ error: "Utilisateur non bloque" });
			}

			return reply.send({ message: "Utilisateur debloque avec succes" });
		} catch (error) {
			return reply.code(500).send({ error: "Erreur serveur" });
		}
	});
});
