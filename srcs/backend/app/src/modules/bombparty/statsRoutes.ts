import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { BombPartyStatsManager } from "./StatsManager.js";
import { BombPartyStatsService } from "./statsService.js";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;

interface StatsParams {
	userId: string;
}

interface HistoryQuery {
	limit?: string;
	offset?: string;
}

export default fp(async function StatsRoutes(fastify: any) {
	const db = fastify.db;
	const statsManager = new BombPartyStatsManager(db);
	const statsService = new BombPartyStatsService(db);
	const authenticateToken = async (
		request: FastifyRequest,
		reply: FastifyReply
	) => {
		try {
			const authHeader = ((request as any).headers?.authorization ||
				((request as any).raw?.headers as any)?.authorization) as
				| string
				| undefined;
			console.log("[Stats API] Auth check:", {
				url: (request as any).url,
				method: (request as any).method,
				hasHeadersAuth: !!(request as any).headers?.authorization,
				hasRawHeadersAuth: !!((request as any).raw?.headers as any)
					?.authorization,
				authHeaderPreview: authHeader
					? `${authHeader.substring(0, 30)}...`
					: null,
			});
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				console.warn("[Stats API] Missing or invalid auth header");
				return reply.code(401).send({ error: "Token manquant" });
			}
			const token = authHeader.split(" ")[1];
			console.log(
				"[Stats API] Verifying token with JWT_SECRET:",
				JWT_SECRET ? "SET" : "NOT SET"
			);
			const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
			console.log(
				"[Stats API] Token verified successfully for user:",
				decoded.id
			);
			(request as any).userId = decoded.id;
		} catch (error) {
			console.error("[Stats API] Authentication error:", {
				error: error instanceof Error ? error.message : String(error),
				errorName: error instanceof Error ? error.name : undefined,
				jwtSecret: JWT_SECRET ? "SET" : "NOT SET",
			});
			return reply.code(401).send({ error: "Invalid or expired token" });
		}
	};

	fastify.get(
		"/bomb-party/stats/:userId",
		{ preHandler: authenticateToken },
		async (request, reply) => {
			try {
				const { userId } = request.params;
				const requestingUserId = (request as any).userId;

				console.log("[Stats API] Stats request:", {
					requestedUserId: userId,
					tokenUserId: requestingUserId,
					match: parseInt(userId) === requestingUserId,
				});
				if (parseInt(userId) !== requestingUserId) {
					console.warn("[Stats API] Access denied: userId mismatch", {
						requested: userId,
						token: requestingUserId,
					});
					return reply.code(403).send({ error: "Access denied" });
				}
				const actualUserId = requestingUserId;
				const result = await statsManager.getUserStats(actualUserId);
				if (!result.success) {
					return reply.code(500).send({ error: result.error });
				}
				return reply.send({
					success: true,
					data: result.data,
				});
			} catch (error) {
				console.error("[Stats API] Error fetching stats:", error);
				return reply.code(500).send({ error: "Server error" });
			}
		}
	);

	fastify.get(
		"/bomb-party/history/:userId",
		{ preHandler: authenticateToken },
		async (request, reply) => {
			try {
				const { userId } = request.params;
				const { limit = "20", offset = "0" } = request.query;
				const requestingUserId = (request as any).userId;
				console.log("[Stats API] History request:", {
					requestedUserId: userId,
					tokenUserId: requestingUserId,
					match: parseInt(userId) === requestingUserId,
				});
				if (parseInt(userId) !== requestingUserId) {
					console.warn("[Stats API] Access denied: userId mismatch", {
						requested: userId,
						token: requestingUserId,
					});
					return reply.code(403).send({ error: "Access denied" });
				}
				const actualUserId = requestingUserId;
				const result = await statsManager.getUserMatchHistory(
					actualUserId,
					parseInt(limit),
					parseInt(offset)
				);
				if (!result.success) {
					return reply.code(500).send({ error: result.error });
				}
				return reply.send({
					success: true,
					data: result.data,
				});
			} catch (error) {
				console.error("[Stats API] Error fetching history:", error);
				return reply.code(500).send({ error: "Server error" });
			}
		}
	);

	fastify.get(
		"/bomb-party/trigram-stats/:userId",
		{ preHandler: authenticateToken },
		async (request, reply) => {
			try {
				const { userId } = request.params;
				const { limit = "10" } = request.query;
				const requestingUserId = (request as any).userId;
				console.log("[Stats API] Trigram stats request:", {
					requestedUserId: userId,
					tokenUserId: requestingUserId,
					match: parseInt(userId) === requestingUserId,
				});
				if (parseInt(userId) !== requestingUserId) {
					console.warn("[Stats API] Access denied: userId mismatch", {
						requested: userId,
						token: requestingUserId,
					});
					return reply.code(403).send({ error: "Access denied" });
				}
				const actualUserId = requestingUserId;
				const result = await statsManager.getUserTrigramStats(
					actualUserId,
					parseInt(limit)
				);
				if (!result.success) {
					return reply.code(500).send({ error: result.error });
				}
				return reply.send({
					success: true,
					data: result.data,
				});
			} catch (error) {
				console.error("[Stats API] Error fetching trigram stats:", error);
				return reply.code(500).send({ error: "Server error" });
			}
		}
	);

	fastify.get("/bomb-party/ranking", async (request, reply) => {
		try {
			const { limit = "50" } = request.query;
			const result = await statsManager.getGlobalRanking(parseInt(limit));
			if (!result.success) {
				return reply.code(500).send({ error: result.error });
			}
			return reply.send({
				success: true,
				data: result.data,
			});
		} catch (error) {
			console.error("[Stats API] Error fetching leaderboard:", error);
			return reply.code(500).send({ error: "Server error" });
		}
	});

	// Statistiques globales (accessible à tous)
	fastify.get("/bomb-party/global-stats", async (request, reply) => {
		try {
			const result = await statsManager.getGlobalStats();
			if (!result.success) {
				return reply.code(500).send({ error: result.error });
			}
			return reply.send({
				success: true,
				data: result.data,
			});
		} catch (error) {
			console.error("[Stats API] Error fetching global stats:", error);
			return reply.code(500).send({ error: "Server error" });
		}
	});

	// Historique global des parties (accessible à tous)
	fastify.get("/bomb-party/global-history", async (request, reply) => {
		try {
			const { limit = "20", offset = "0" } = request.query;
			const result = await statsManager.getGlobalMatchHistory(
				parseInt(limit),
				parseInt(offset)
			);
			if (!result.success) {
				return reply.code(500).send({ error: result.error });
			}
			return reply.send({
				success: true,
				data: result.data,
			});
		} catch (error) {
			console.error("[Stats API] Error fetching global history:", error);
			return reply.code(500).send({ error: "Server error" });
		}
	});

	fastify.post(
		"/bomb-party/stats/update",
		{ preHandler: authenticateToken },
		async (request, reply) => {
			try {
				const userId = (request as any).userId;
				const matchData = request.body as {
					matchId: number;
					isWin: boolean;
					wordsSubmitted: number;
					validWords: number;
					bestStreak: number;
					averageResponseTime: number;
					matchDuration: number;
					position: number;
					finalLives: number;
				};
				const statsResult = await statsManager.updateUserStats(userId, {
					isWin: matchData.isWin,
					wordsSubmitted: matchData.wordsSubmitted,
					validWords: matchData.validWords,
					bestStreak: matchData.bestStreak,
					averageResponseTime: matchData.averageResponseTime,
					matchDuration: matchData.matchDuration,
				});
				if (!statsResult.success) {
					return reply.code(500).send({ error: statsResult.error });
				}
				const historyResult = await statsManager.addMatchHistory(
					userId,
					matchData.matchId,
					{
						position: matchData.position,
						wordsSubmitted: matchData.wordsSubmitted,
						validWords: matchData.validWords,
						finalLives: matchData.finalLives,
						matchDuration: matchData.matchDuration,
					}
				);
				if (!historyResult.success) {
					console.error(
						"[Stats API] Error adding history:",
						historyResult.error
					);
				}
				try {
					const userStatsResult = await statsManager.getUserStats(userId);
					if (userStatsResult.success && userStatsResult.data) {
						const progressResult = await statsService.updateProgress(
							userId,
							{
								isWin: matchData.isWin,
								wordsSubmitted: matchData.wordsSubmitted,
								validWords: matchData.validWords,
								bestStreak: matchData.bestStreak,
								matchDuration: matchData.matchDuration,
								finalLives: matchData.finalLives,
							},
							{
								totalWins: userStatsResult.data.totalWins,
								totalMatches: userStatsResult.data.totalMatches,
								totalValidWords: userStatsResult.data.totalValidWords,
								averageResponseTime: userStatsResult.data.averageResponseTime,
								bestStreak: userStatsResult.data.bestStreak,
							}
						);
						if (progressResult.success && progressResult.data) {
							return reply.send({
								success: true,
								message: "Statistics updated successfully",
								progress: progressResult.data,
							});
						}
					}
				} catch (progressError) {
					console.error("[Stats API] Error updating progress:", progressError);
				}
				return reply.send({
					success: true,
					message: "Statistics updated successfully",
				});
			} catch (error) {
				console.error("[Stats API] Error updating stats:", error);
				return reply.code(500).send({ error: "Server error" });
			}
		}
	);

	fastify.post(
		"/bomb-party/trigram-stats/update",
		{ preHandler: authenticateToken },
		async (request, reply) => {
			try {
				const userId = (request as any).userId;
				const { trigram, isSuccess, responseTime } = request.body as {
					trigram: string;
					isSuccess: boolean;
					responseTime: number;
				};
				const result = await statsManager.updateTrigramStats(
					userId,
					trigram,
					isSuccess,
					responseTime
				);
				if (!result.success) {
					return reply.code(500).send({ error: result.error });
				}
				return reply.send({
					success: true,
					message: "Trigram statistics updated",
				});
			} catch (error) {
				console.error("[Stats API] Error updating trigram stats:", error);
				return reply.code(500).send({ error: "Server error" });
			}
		}
	);

	fastify.post("/bomb-party/stats/update-local", async (request, reply) => {
		try {
			const matchData = request.body as {
				matchId: number;
				isWin: boolean;
				wordsSubmitted: number;
				validWords: number;
				bestStreak: number;
				averageResponseTime: number;
				matchDuration: number;
				position: number;
				finalLives: number;
				playerName: string;
			};
			const guestId = await getOrCreateGuestUser(matchData.playerName, db);
			console.log(
				`[stats api] saving local for guest: ${matchData.playerName} (id: ${guestId})`
			);
			const statsResult = await statsManager.updateUserStats(guestId, {
				isWin: matchData.isWin,
				wordsSubmitted: matchData.wordsSubmitted,
				validWords: matchData.validWords,
				bestStreak: matchData.bestStreak,
				averageResponseTime: matchData.averageResponseTime,
				matchDuration: matchData.matchDuration,
			});
			if (!statsResult.success) {
				return reply.code(500).send({ error: statsResult.error });
			}
			const historyResult = await statsManager.addMatchHistory(
				guestId,
				matchData.matchId,
				{
					position: matchData.position,
					wordsSubmitted: matchData.wordsSubmitted,
					validWords: matchData.validWords,
					finalLives: matchData.finalLives,
					matchDuration: matchData.matchDuration,
				}
			);
			if (!historyResult.success) {
				console.error("[Stats API] Error adding history:", historyResult.error);
			}
			return reply.send({
				success: true,
				message: "Local statistics updated successfully",
				guestId: guestId,
			});
		} catch (error) {
			console.error("[Stats API] Error updating local stats:", error);
			return reply.code(500).send({ error: "Server error" });
		}
	});

	async function getOrCreateGuestUser(
		playerName: string,
		database: any
	): Promise<number> {
		return new Promise((resolve, reject) => {
			database.get(
				"SELECT id FROM users WHERE name = ? AND email LIKE 'guest_%'",
				[playerName],
				(err: any, row: any) => {
					if (err) {
						console.error("[Stats API] Error finding guest user:", err);
						reject(err);
						return;
					}
					if (row) {
						resolve(row.id);
						return;
					}
					const guestEmail = `guest_${playerName}_${Date.now()}@local`;
					database.run(
						"INSERT INTO users (name, email, password, display_name) VALUES (?, ?, ?, ?)",
						[playerName, guestEmail, "guest", playerName],
						function (this: any, err: any) {
							if (err) {
								console.error("[Stats API] Error creating guest user:", err);
								reject(err);
								return;
							}
							console.log(
								`[Stats API] Created guest user: ${playerName} (ID: ${this.lastID})`
							);
							resolve(this.lastID);
						}
					);
				}
			);
		});
	}

	fastify.get("/bomb-party/suggestions", async (request, reply) => {
		try {
			const { syllable, max = "5" } = request.query;
			if (!syllable || typeof syllable !== "string") {
				return reply
					.code(400)
					.send({ error: "Syllable parameter is required" });
			}
			const { getWordSuggestions } = await import("./syllableSelector.js");
			const suggestions = getWordSuggestions(syllable, parseInt(max) || 5);
			return reply.send({
				success: true,
				data: {
					syllable,
					suggestions,
				},
			});
		} catch (error) {
			console.error("[BombParty API] Error fetching word suggestions:", error);
			return reply.code(500).send({ error: "Server error" });
		}
	});

	fastify.post("/bomb-party/validate-word", async (request, reply) => {
		try {
			const { word, syllable, usedWords } = request.body as {
				word: string;
				syllable: string;
				usedWords: string[];
			};

			if (!word || !syllable) {
				return reply.code(400).send({
					error: "Word and syllable parameters are required",
				});
			}

			const { validateWithDictionary } = await import("./validator.js");
			const validation = await validateWithDictionary(
				word,
				syllable,
				usedWords || []
			);

			return reply.send({
				success: true,
				data: validation,
			});
		} catch (error) {
			console.error("[BombParty API] Error validating word:", error);
			return reply.code(500).send({ error: "Server error" });
		}
	});

	fastify.get("/bomb-party/syllable/random", async (request, reply) => {
		try {
			const { exclude } = request.query as { exclude?: string };
			const { getRandomSyllable, getSyllableDifficulty } = await import(
				"./syllableSelector.js"
			);

			const syllable = getRandomSyllable(exclude);
			const difficulty = getSyllableDifficulty(syllable);

			return reply.send({
				success: true,
				data: {
					syllable,
					difficulty,
				},
			});
		} catch (error) {
			console.error("[BombParty API] Error getting random syllable:", error);
			return reply.code(500).send({ error: "Server error" });
		}
	});

	fastify.get("/bomb-party/syllable/info/:syllable", async (request, reply) => {
		try {
			const { syllable } = request.params as { syllable: string };

			if (!syllable) {
				return reply
					.code(400)
					.send({ error: "Syllable parameter is required" });
			}

			const { getSyllableInfo, getSyllableDifficulty } = await import(
				"./syllableSelector.js"
			);
			const info = getSyllableInfo(syllable);
			const difficulty = getSyllableDifficulty(syllable);

			return reply.send({
				success: true,
				data: {
					...info,
					difficulty,
				},
			});
		} catch (error) {
			console.error("[BombParty API] Error getting syllable info:", error);
			return reply.code(500).send({ error: "Server error" });
		}
	});

	fastify.get(
		"/bomb-party/progress/:userId",
		{ preHandler: authenticateToken },
		async (request, reply) => {
			try {
				const { userId } = request.params;
				const requestingUserId = (request as any).userId;
				if (parseInt(userId) !== requestingUserId) {
					return reply.code(403).send({ error: "Access denied" });
				}
				const result = await statsService.getUserProgress(requestingUserId);
				if (!result.success) {
					return reply.code(500).send({ error: result.error });
				}
				return reply.send({
					success: true,
					data: result.data,
				});
			} catch (error) {
				console.error("[Stats API] Error fetching progress:", error);
				return reply.code(500).send({ error: "Server error" });
			}
		}
	);

	fastify.post(
		"/bomb-party/progress/update",
		{ preHandler: authenticateToken },
		async (request, reply) => {
			try {
				const userId = (request as any).userId;
				const matchData = request.body as {
					isWin: boolean;
					wordsSubmitted: number;
					validWords: number;
					bestStreak: number;
					matchDuration: number;
					finalLives?: number;
				};
				const statsResult = await statsManager.getUserStats(userId);
				if (!statsResult.success || !statsResult.data) {
					return reply.code(500).send({ error: "Failed to get user stats" });
				}
				const userStats = statsResult.data;
				const progressResult = await statsService.updateProgress(
					userId,
					matchData,
					{
						totalWins: userStats.totalWins,
						totalMatches: userStats.totalMatches,
						totalValidWords: userStats.totalValidWords,
						averageResponseTime: userStats.averageResponseTime,
						bestStreak: userStats.bestStreak,
					}
				);

				if (!progressResult.success) {
					return reply.code(500).send({ error: progressResult.error });
				}
				return reply.send({
					success: true,
					data: progressResult.data,
				});
			} catch (error) {
				console.error("[Stats API] Error updating progress:", error);
				return reply.code(500).send({ error: "Server error" });
			}
		}
	);

	fastify.post(
		"/bomb-party/progress/preferences",
		{ preHandler: authenticateToken },
		async (request, reply) => {
			try {
				const userId = (request as any).userId;
				const preferences = request.body as {
					theme?: string;
					avatar?: string;
				};
				const result = await statsService.updateUserPreferences(
					userId,
					preferences
				);
				if (!result.success) {
					return reply.code(500).send({ error: result.error });
				}
				return reply.send({
					success: true,
					message: "Preferences updated",
				});
			} catch (error) {
				console.error("[Stats API] Error updating preferences:", error);
				return reply.code(500).send({ error: "Server error" });
			}
		}
	);
});
