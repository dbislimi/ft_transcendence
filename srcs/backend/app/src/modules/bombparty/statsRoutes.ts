import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { BombPartyStatsManager } from "./StatsManager.ts";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;

interface StatsParams {
  userId: string;
}

interface HistoryQuery {
  limit?: string;
  offset?: string;
}

const statsRoutes: FastifyPluginAsync<{ prefix?: string }> = async (
  fastify: FastifyInstance<any, any, any, any, any>,
  options
) => {
  
  const db = (await import("../../../index.js")).default;
  const statsManager = new BombPartyStatsManager(db);
  

  const authenticateToken = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Try request.headers first (normalized by Fastify), then fallback to request.raw.headers
      const authHeader = (request.headers.authorization || 
        ((request as any).raw?.headers as any)?.authorization) as string | undefined;
      
      console.log("[Stats API] Auth check:", {
        url: request.url,
        method: request.method,
        hasHeadersAuth: !!request.headers.authorization,
        hasRawHeadersAuth: !!((request as any).raw?.headers as any)?.authorization,
        authHeaderPreview: authHeader ? `${authHeader.substring(0, 30)}...` : null
      });
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.warn("[Stats API] Missing or invalid auth header");
        return reply.code(401).send({ error: "Token manquant" });
      }

      const token = authHeader.split(" ")[1];
      console.log("[Stats API] Verifying token with JWT_SECRET:", JWT_SECRET ? "SET" : "NOT SET");
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      
      console.log("[Stats API] Token verified successfully for user:", decoded.id);
      (request as any).userId = decoded.id;
    } catch (error) {
      console.error("[Stats API] Authentication error:", {
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : undefined,
        jwtSecret: JWT_SECRET ? "SET" : "NOT SET"
      });
      return reply.code(401).send({ error: "Invalid or expired token" });
    }
  };

  fastify.get<{ Params: StatsParams }>(
    "/api/bomb-party/stats/:userId",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        const { userId } = request.params;
        const requestingUserId = (request as any).userId;

        console.log("[Stats API] Stats request:", {
          requestedUserId: userId,
          tokenUserId: requestingUserId,
          match: parseInt(userId) === requestingUserId
        });

        if (parseInt(userId) !== requestingUserId) {
          console.warn("[Stats API] Access denied: userId mismatch", {
            requested: userId,
            token: requestingUserId
          });
          return reply.code(403).send({ error: "Access denied" });
        }

        // Use the userId from the token (source of truth) instead of the URL param
        const actualUserId = requestingUserId;
        const result = await statsManager.getUserStats(actualUserId);
        
        if (!result.success) {
          return reply.code(500).send({ error: result.error });
        }

        return reply.send({
          success: true,
          data: result.data
        });
      } catch (error) {
        console.error("[Stats API] Error fetching stats:", error);
        return reply.code(500).send({ error: "Server error" });
      }
    }
  );

  fastify.get<{ Params: StatsParams; Querystring: HistoryQuery }>(
    "/api/bomb-party/history/:userId",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        const { userId } = request.params;
        const { limit = "20", offset = "0" } = request.query;
        const requestingUserId = (request as any).userId;

        console.log("[Stats API] History request:", {
          requestedUserId: userId,
          tokenUserId: requestingUserId,
          match: parseInt(userId) === requestingUserId
        });

        if (parseInt(userId) !== requestingUserId) {
          console.warn("[Stats API] Access denied: userId mismatch", {
            requested: userId,
            token: requestingUserId
          });
          return reply.code(403).send({ error: "Access denied" });
        }

        // Use the userId from the token (source of truth) instead of the URL param
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
          data: result.data
        });
      } catch (error) {
        console.error("[Stats API] Error fetching history:", error);
        return reply.code(500).send({ error: "Server error" });
      }
    }
  );

  fastify.get<{ Params: StatsParams; Querystring: { limit?: string } }>(
    "/api/bomb-party/trigram-stats/:userId",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        const { userId } = request.params;
        const { limit = "10" } = request.query;
        const requestingUserId = (request as any).userId;

        console.log("[Stats API] Trigram stats request:", {
          requestedUserId: userId,
          tokenUserId: requestingUserId,
          match: parseInt(userId) === requestingUserId
        });

        if (parseInt(userId) !== requestingUserId) {
          console.warn("[Stats API] Access denied: userId mismatch", {
            requested: userId,
            token: requestingUserId
          });
          return reply.code(403).send({ error: "Access denied" });
        }

        // Use the userId from the token (source of truth) instead of the URL param
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
          data: result.data
        });
      } catch (error) {
        console.error("[Stats API] Error fetching trigram stats:", error);
        return reply.code(500).send({ error: "Server error" });
      }
    }
  );

  fastify.get<{ Querystring: { limit?: string } }>(
    "/api/bomb-party/ranking",
    async (request, reply) => {
      try {
        const { limit = "50" } = request.query;

        const result = await statsManager.getGlobalRanking(parseInt(limit));
        
        if (!result.success) {
          return reply.code(500).send({ error: result.error });
        }

        return reply.send({
          success: true,
          data: result.data
        });
      } catch (error) {
        console.error("[Stats API] Error fetching leaderboard:", error);
        return reply.code(500).send({ error: "Server error" });
      }
    }
  );

  fastify.post(
    "/api/bomb-party/stats/update",
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
          favoriteTrigram?: string;
        };

        const statsResult = await statsManager.updateUserStats(userId, {
          isWin: matchData.isWin,
          wordsSubmitted: matchData.wordsSubmitted,
          validWords: matchData.validWords,
          bestStreak: matchData.bestStreak,
          averageResponseTime: matchData.averageResponseTime,
          matchDuration: matchData.matchDuration,
          favoriteTrigram: matchData.favoriteTrigram
        });

        if (!statsResult.success) {
          return reply.code(500).send({ error: statsResult.error });
        }

        const historyResult = await statsManager.addMatchHistory(userId, matchData.matchId, {
          position: matchData.position,
          wordsSubmitted: matchData.wordsSubmitted,
          validWords: matchData.validWords,
          finalLives: matchData.finalLives,
          matchDuration: matchData.matchDuration
        });

        if (!historyResult.success) {
          console.error("[Stats API] Error adding history:", historyResult.error);
        }

        return reply.send({
          success: true,
          message: "Statistics updated successfully"
        });
      } catch (error) {
        console.error("[Stats API] Error updating stats:", error);
        return reply.code(500).send({ error: "Server error" });
      }
    }
  );

  fastify.post(
    "/api/bomb-party/trigram-stats/update",
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
          message: "Trigram statistics updated"
        });
      } catch (error) {
        console.error("[Stats API] Error updating trigram stats:", error);
        return reply.code(500).send({ error: "Server error" });
      }
    }
  );

  // Endpoint pour sauvegarder les stats en local (sans authentification)
  // Utilise un utilisateur "Guest" spécial avec playerName pour identifier la session locale
  fastify.post(
    "/api/bomb-party/stats/update-local",
    async (request, reply) => {
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
          favoriteTrigram?: string;
          playerName: string; // Nom du joueur local
        };

        // Créer ou récupérer l'utilisateur "Guest" avec le nom du joueur
        const guestId = await getOrCreateGuestUser(matchData.playerName, db);
        
        console.log(`[Stats API] Saving local stats for guest: ${matchData.playerName} (ID: ${guestId})`);

        const statsResult = await statsManager.updateUserStats(guestId, {
          isWin: matchData.isWin,
          wordsSubmitted: matchData.wordsSubmitted,
          validWords: matchData.validWords,
          bestStreak: matchData.bestStreak,
          averageResponseTime: matchData.averageResponseTime,
          matchDuration: matchData.matchDuration,
          favoriteTrigram: matchData.favoriteTrigram
        });

        if (!statsResult.success) {
          return reply.code(500).send({ error: statsResult.error });
        }

        const historyResult = await statsManager.addMatchHistory(guestId, matchData.matchId, {
          position: matchData.position,
          wordsSubmitted: matchData.wordsSubmitted,
          validWords: matchData.validWords,
          finalLives: matchData.finalLives,
          matchDuration: matchData.matchDuration
        });

        if (!historyResult.success) {
          console.error("[Stats API] Error adding history:", historyResult.error);
        }

        return reply.send({
          success: true,
          message: "Local statistics updated successfully",
          guestId: guestId
        });
      } catch (error) {
        console.error("[Stats API] Error updating local stats:", error);
        return reply.code(500).send({ error: "Server error" });
      }
    }
  );

  // Fonction helper pour créer ou récupérer un utilisateur guest
  async function getOrCreateGuestUser(playerName: string, database: any): Promise<number> {
    return new Promise((resolve, reject) => {
      // Chercher un utilisateur guest existant avec ce nom
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

          // Créer un nouvel utilisateur guest
          const guestEmail = `guest_${playerName}_${Date.now()}@local`;
          database.run(
            "INSERT INTO users (name, email, password, display_name) VALUES (?, ?, ?, ?)",
            [playerName, guestEmail, 'guest', playerName],
            function(this: any, err: any) {
              if (err) {
                console.error("[Stats API] Error creating guest user:", err);
                reject(err);
                return;
              }
              console.log(`[Stats API] Created guest user: ${playerName} (ID: ${this.lastID})`);
              resolve(this.lastID);
            }
          );
        }
      );
    });
  }

  // Endpoint pour obtenir des suggestions de mots pour une syllabe
  fastify.get<{ Querystring: { syllable: string; max?: string } }>(
    "/api/bomb-party/suggestions",
    async (request, reply) => {
      try {
        const { syllable, max = "5" } = request.query;
        
        if (!syllable || typeof syllable !== 'string') {
          return reply.code(400).send({ error: "Syllable parameter is required" });
        }

        const { getWordSuggestions } = await import('./syllableSelector.ts');
        const suggestions = getWordSuggestions(syllable, parseInt(max) || 5);
        
        return reply.send({
          success: true,
          data: {
            syllable,
            suggestions
          }
        });
      } catch (error) {
        console.error("[BombParty API] Error fetching word suggestions:", error);
        return reply.code(500).send({ error: "Server error" });
      }
    }
  );
  
};

export default fp(statsRoutes);
