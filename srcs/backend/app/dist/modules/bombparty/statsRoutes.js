import fp from "fastify-plugin";
import * as jwt from "jsonwebtoken";
import { BombPartyStatsManager } from "./StatsManager.ts";
const JWT_SECRET = "super_secret_key"; // À stocker dans un fichier .env
/**
 * Plugin Fastify pour les routes de statistiques Bomb Party
 */
const statsRoutes = async (fastify, options) => {
    const db = (await import("../../../index.js")).default;
    const statsManager = new BombPartyStatsManager(db);
    /**
     * Middleware d'authentification
     */
    const authenticateToken = async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return reply.code(401).send({ error: "Token manquant" });
            }
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            request.userId = decoded.id;
        }
        catch (error) {
            return reply.code(401).send({ error: "Token invalide ou expiré" });
        }
    };
    /**
     * GET /api/bomb-party/stats/:userId
     * Récupère les statistiques d'un utilisateur
     */
    fastify.get("/api/bomb-party/stats/:userId", { preHandler: authenticateToken }, async (request, reply) => {
        try {
            const { userId } = request.params;
            const requestingUserId = request.userId;
            if (parseInt(userId) !== requestingUserId) {
                return reply.code(403).send({ error: "Accès non autorisé" });
            }
            const result = await statsManager.getUserStats(parseInt(userId));
            if (!result.success) {
                return reply.code(500).send({ error: result.error });
            }
            return reply.send({
                success: true,
                data: result.data
            });
        }
        catch (error) {
            console.error("[Stats API] Erreur récupération stats:", error);
            return reply.code(500).send({ error: "Erreur serveur" });
        }
    });
    /**
     * GET /api/bomb-party/history/:userId
     * Récupère l'historique des parties d'un utilisateur
     */
    fastify.get("/api/bomb-party/history/:userId", { preHandler: authenticateToken }, async (request, reply) => {
        try {
            const { userId } = request.params;
            const { limit = "20", offset = "0" } = request.query;
            const requestingUserId = request.userId;
            if (parseInt(userId) !== requestingUserId) {
                return reply.code(403).send({ error: "Accès non autorisé" });
            }
            const result = await statsManager.getUserMatchHistory(parseInt(userId), parseInt(limit), parseInt(offset));
            if (!result.success) {
                return reply.code(500).send({ error: result.error });
            }
            return reply.send({
                success: true,
                data: result.data
            });
        }
        catch (error) {
            console.error("[Stats API] Erreur récupération historique:", error);
            return reply.code(500).send({ error: "Erreur serveur" });
        }
    });
    /**
     * GET /api/bomb-party/trigram-stats/:userId
     * Récupère les statistiques de trigrammes d'un utilisateur
     */
    fastify.get("/api/bomb-party/trigram-stats/:userId", { preHandler: authenticateToken }, async (request, reply) => {
        try {
            const { userId } = request.params;
            const { limit = "10" } = request.query;
            const requestingUserId = request.userId;
            if (parseInt(userId) !== requestingUserId) {
                return reply.code(403).send({ error: "Accès non autorisé" });
            }
            const result = await statsManager.getUserTrigramStats(parseInt(userId), parseInt(limit));
            if (!result.success) {
                return reply.code(500).send({ error: result.error });
            }
            return reply.send({
                success: true,
                data: result.data
            });
        }
        catch (error) {
            console.error("[Stats API] Erreur récupération trigram stats:", error);
            return reply.code(500).send({ error: "Erreur serveur" });
        }
    });
    /**
     * GET /api/bomb-party/ranking
     * Récupère le classement global des joueurs
     */
    fastify.get("/api/bomb-party/ranking", async (request, reply) => {
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
        }
        catch (error) {
            console.error("[Stats API] Erreur récupération classement:", error);
            return reply.code(500).send({ error: "Erreur serveur" });
        }
    });
    /**
     * POST /api/bomb-party/stats/update
     * Met à jour les statistiques après une partie (appelé par le système de jeu)
     */
    fastify.post("/api/bomb-party/stats/update", { preHandler: authenticateToken }, async (request, reply) => {
        try {
            const userId = request.userId;
            const matchData = request.body;
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
                console.error("[Stats API] Erreur ajout historique:", historyResult.error);
            }
            return reply.send({
                success: true,
                message: "Statistiques mises à jour avec succès"
            });
        }
        catch (error) {
            console.error("[Stats API] Erreur mise à jour stats:", error);
            return reply.code(500).send({ error: "Erreur serveur" });
        }
    });
    /**
     * POST /api/bomb-party/trigram-stats/update
     * Met à jour les statistiques de trigrammes (appelé pendant le jeu)
     */
    fastify.post("/api/bomb-party/trigram-stats/update", { preHandler: authenticateToken }, async (request, reply) => {
        try {
            const userId = request.userId;
            const { trigram, isSuccess, responseTime } = request.body;
            const result = await statsManager.updateTrigramStats(userId, trigram, isSuccess, responseTime);
            if (!result.success) {
                return reply.code(500).send({ error: result.error });
            }
            return reply.send({
                success: true,
                message: "Statistiques de trigramme mises à jour"
            });
        }
        catch (error) {
            console.error("[Stats API] Erreur mise à jour trigram stats:", error);
            return reply.code(500).send({ error: "Erreur serveur" });
        }
    });
};
export default fp(statsRoutes);
