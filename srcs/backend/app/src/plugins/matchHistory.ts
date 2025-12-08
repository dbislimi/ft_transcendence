import fp from "fastify-plugin";

interface Match {
	id: number;
	player1_id: number;
	player2_id: number;
	winner_id: number;
	played_at: string;
	player1_name: string;
	player2_name: string;
	player1_avatar: string;
	player2_avatar: string;
	winner_name: string;
	is_bot: boolean | number;
	bot_difficulty?: string;
	scores?: string;
	match_type?: string;
}

async function matchHistoryPlugin(fastify: any, opts: any) {
	fastify.decorate(
		"saveMatch",
		async function (
			player1Id: number,
			player2Id: number | null,
			winnerId: number | null,
			scores?: number[],
			botDifficulty?: string,
			matchType: string = "quick"
		) {
			const saveKey = `${player1Id}-${
				player2Id || "bot"
			}-${winnerId}-${Date.now()}`;

			if (
				this.recentSaves &&
				this.recentSaves.has(
					saveKey.substring(0, saveKey.lastIndexOf("-"))
				)
			) {
				fastify.log.warn(
					`Match doublon ignoré: P1=${player1Id}, P2=${player2Id}, Winner=${winnerId}`
				);
				return Promise.resolve();
			}

			if (!this.recentSaves) {
				this.recentSaves = new Set();
			}

			return new Promise<void>((resolve, reject) => {
				const isBot = player2Id === null;
				const scoresJson = scores ? JSON.stringify(scores) : null;
				const finalWinnerId =
					winnerId === -1 || (isBot && winnerId === null)
						? null
						: winnerId;

				const baseKey = `${player1Id}-${
					player2Id || "bot"
				}-${winnerId}`;
				this.recentSaves.add(baseKey);

				fastify.db.run(
					`INSERT INTO matches (player1_id, player2_id, winner_id, is_bot, bot_difficulty, scores, match_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
					[
						player1Id,
						player2Id,
						finalWinnerId,
						isBot ? 1 : 0,
						botDifficulty || null,
						scoresJson,
						matchType,
					],
					async function (err: any) {
						if (err) {
							fastify.recentSaves?.delete(baseKey);
							fastify.log.error("Erreur sauvegarde match:", err);
							reject(err);
						} else {
							fastify.log.info(
								`Match sauvegardé ID: ${this.lastID} (P1=${player1Id}, P2=${player2Id}, Winner=${winnerId}, Bot=${isBot}, Type=${matchType})`
							);

							try {
								await fastify.updateUserStats(
									player1Id,
									winnerId === player1Id
								);
								if (player2Id) {
									await fastify.updateUserStats(
										player2Id,
										winnerId === player2Id
									);
								}
								fastify.log.info(
									`Stats updated for match ${this.lastID}`
								);
							} catch (statsError) {
								fastify.log.error(
									"Erreur mise à jour stats:",
									statsError
								);
							}

							setTimeout(() => {
								fastify.recentSaves?.delete(baseKey);
							}, 2000);

							resolve();
						}
					}
				);
			});
		}
	);

	fastify.decorate(
		"updateUserStats",
		async function (userId: number, isWin: boolean) {
			return new Promise<void>((resolve, reject) => {
				const column = isWin ? "wins" : "losses";
				fastify.db.run(
					`UPDATE users SET ${column} = ${column} + 1 WHERE id = ?`,
					[userId],
					(err: any) => {
						if (err) {
							fastify.log.error("Erreur mise à jour stats:", err);
							reject(err);
						} else {
							resolve();
						}
					}
				);
			});
		}
	);

	fastify.decorate(
		"incrementTournamentsWon",
		async function (userId: number) {
			return new Promise<void>((resolve, reject) => {
				fastify.db.run(
					`UPDATE users SET tournaments_won = tournaments_won + 1 WHERE id = ?`,
					[userId],
					(err: any) => {
						if (err) {
							fastify.log.error(
								"Erreur mise à jour tournois gagnés:",
								err
							);
							reject(err);
						} else {
							fastify.log.info(
								`Tournament win added for user ${userId}`
							);
							resolve();
						}
					}
				);
			});
		}
	);

	fastify.get(
		"/match-history/:userId",
		{
			preHandler: fastify.authHook,
		},
		async (request: any, reply: any) => {
			const { userId } = request.params;
			const { page = 1, limit = 10 } = request.query;
			const offset = (page - 1) * limit;

			return new Promise((resolve, reject) => {
				fastify.db.all(
					`SELECT 
          m.id,
          m.player1_id,
          m.player2_id,
          m.winner_id,
          m.played_at,
          m.is_bot,
          m.bot_difficulty,
          m.scores,
          m.match_type,
          p1.display_name as player1_name,
          p1.avatar as player1_avatar,
          p2.display_name as player2_name,
          p2.avatar as player2_avatar,
          w.display_name as winner_name
         FROM matches m
         LEFT JOIN users p1 ON m.player1_id = p1.id
         LEFT JOIN users p2 ON m.player2_id = p2.id
         LEFT JOIN users w ON m.winner_id = w.id
         WHERE m.player1_id = ? OR m.player2_id = ?
         ORDER BY m.played_at DESC
         LIMIT ? OFFSET ?`,
					[userId, userId, limit, offset],
					(err: any, rows: Match[]) => {
						if (err) {
							fastify.log.error(
								"Erreur récupération historique:",
								err
							);
							reply.code(500).send({ error: "Erreur serveur" });
							reject(err);
						} else {
							const matches = rows.map((match) => {
								fastify.log.info(
									`Processing match ${match.id}: is_bot=${match.is_bot}, player1_id=${match.player1_id}, player2_id=${match.player2_id}, bot_difficulty=${match.bot_difficulty}, match_type=${match.match_type}`
								);

								return {
									...match,
									scores: match.scores
										? JSON.parse(match.scores)
										: null,
									matchType: match.match_type || "quick",
									opponent:
										match.is_bot === 1
											? {
													name: `Bot (${match.bot_difficulty})`,
													avatar: "/avatars/bot.png",
													isBot: true,
											  }
											: match.player1_id ===
											  parseInt(userId)
											? {
													name:
														match.player2_name ||
														"Joueur inconnu",
													avatar:
														match.player2_avatar ||
														"/avatars/avatar1.png",
													isBot: false,
											  }
											: {
													name:
														match.player1_name ||
														"Joueur inconnu",
													avatar:
														match.player1_avatar ||
														"/avatars/avatar1.png",
													isBot: false,
											  },
									isWinner:
										match.winner_id === parseInt(userId),
									date: new Date(
										match.played_at
									).toISOString(),
								};
							});
							resolve(matches);
						}
					}
				);
			});
		}
	);

	fastify.get(
		"/user-stats/:userId",
		{
			preHandler: fastify.authHook,
		},
		async (request: any, reply: any) => {
			const { userId } = request.params;
			fastify.log.info(`Requête user-stats pour userId: ${userId}`);

			return new Promise((resolve, reject) => {
				fastify.db.get(
					`SELECT 
          wins,
          losses,
          tournaments_won,
          (SELECT COUNT(*) FROM matches WHERE player1_id = ? OR player2_id = ?) as total_games,
          (SELECT COUNT(*) FROM matches WHERE winner_id = ? AND is_bot = 1) as bot_wins,
          (SELECT COUNT(*) FROM matches WHERE winner_id = ? AND is_bot = 0) as player_wins
         FROM users WHERE id = ?`,
					[userId, userId, userId, userId, userId],
					(err: any, row: any) => {
						if (err) {
							fastify.log.error(
								"Erreur récupération stats:",
								err
							);
							reply.code(500).send({ error: "Erreur serveur" });
							reject(err);
						} else if (!row) {
							fastify.log.warn(
								`Utilisateur non trouvé: userId=${userId}`
							);
							reply
								.code(404)
								.send({ error: "Utilisateur non trouvé" });
							reject(new Error("User not found"));
						} else {
							const stats = {
								totalGames: row.total_games || 0,
								wins: row.wins || 0,
								losses: row.losses || 0,
								winRate:
									row.total_games > 0
										? Math.round(
												(row.wins / row.total_games) *
													100
										  )
										: 0,
								botWins: row.bot_wins || 0,
								playerWins: row.player_wins || 0,
								tournamentsWon: row.tournaments_won || 0,
							};
							fastify.log.info(
								`Stats récupérées pour userId ${userId}:`,
								stats
							);
							resolve(stats);
						}
					}
				);
			});
		}
	);

	fastify.get(
		"/debug/matches",
		{
			preHandler: fastify.authHook,
		},
		async (request: any, reply: any) => {
			return new Promise((resolve, reject) => {
				fastify.db.all(
					`SELECT 
          m.id,
          m.player1_id,
          m.player2_id,
          m.winner_id,
          m.is_bot,
          m.bot_difficulty,
          m.scores,
          m.played_at,
          m.match_type,
          p1.display_name as player1_name,
          p2.display_name as player2_name,
          w.display_name as winner_name
         FROM matches m
         LEFT JOIN users p1 ON m.player1_id = p1.id
         LEFT JOIN users p2 ON m.player2_id = p2.id
         LEFT JOIN users w ON m.winner_id = w.id
         ORDER BY m.played_at DESC
         LIMIT 20`,
					[],
					(err: any, rows: any[]) => {
						if (err) {
							fastify.log.error("Erreur debug matches:", err);
							reply.code(500).send({ error: "Erreur serveur" });
							reject(err);
						} else {
							resolve(rows);
						}
					}
				);
			});
		}
	);
}

export default fp(matchHistoryPlugin);
