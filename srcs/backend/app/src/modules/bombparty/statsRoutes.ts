import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import * as jwt from "jsonwebtoken";
import { BombPartyStatsManager } from "./StatsManager.ts";

const JWT_SECRET = "super_secret_key"; // Should be stored in .env file

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
      const authHeader = ((request as any).raw?.headers as any)?.authorization as string | undefined;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Token manquant" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      
      (request as any).userId = decoded.id;
    } catch (error) {
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

        if (parseInt(userId) !== requestingUserId) {
          return reply.code(403).send({ error: "Access denied" });
        }

        const result = await statsManager.getUserStats(parseInt(userId));
        
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

        if (parseInt(userId) !== requestingUserId) {
          return reply.code(403).send({ error: "Access denied" });
        }

        const result = await statsManager.getUserMatchHistory(
          parseInt(userId),
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

        if (parseInt(userId) !== requestingUserId) {
          return reply.code(403).send({ error: "Access denied" });
        }

        const result = await statsManager.getUserTrigramStats(
          parseInt(userId),
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
  
};

export default fp(statsRoutes);
