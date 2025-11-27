import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { verifyToken } from '../utils/auth.ts';
import { AsyncLock } from '../utils/AsyncLock.ts';

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
  is_bot: boolean;
  bot_difficulty?: string;
  scores?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    saveMatch: (
      player1Id: number,
      player2Id: number | null,
      winnerId: number | null,
      scores?: number[],
      botDifficulty?: string,
      matchType?: string
    ) => Promise<void>;
    updateUserStats: (userId: number, isWin: boolean) => Promise<void>;
    incrementTournamentsWon: (userId: number) => Promise<void>;
    recentSaves?: Set<string>;
  }
}

export default fp(async function matchesPlugin(fastify: FastifyInstance) {
  const saveLock = new AsyncLock();

  fastify.decorate("updateUserStats", async function (userId: number, isWin: boolean) {
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
  });

  fastify.decorate("saveMatch", async function (
    player1Id: number,
    player2Id: number | null,
    winnerId: number | null,
    scores?: number[],
    botDifficulty?: string,
    matchType: string = 'quick'
  ) {
    return saveLock.acquire(async () => {
      const saveKey = `${player1Id}-${player2Id || 'bot'}-${winnerId}-${Date.now()}`;

      // Gestion anti-doublons
      if (fastify.recentSaves && fastify.recentSaves.has(saveKey.substring(0, saveKey.lastIndexOf('-')))) {
        fastify.log.warn(`match doublon ignore: P1=${player1Id}, P2=${player2Id}, Winner=${winnerId}`);
        return;
      }

      if (!fastify.recentSaves) {
        fastify.recentSaves = new Set();
      }

      const baseKey = `${player1Id}-${player2Id || 'bot'}-${winnerId}`;
      fastify.recentSaves.add(baseKey);

      return new Promise<void>((resolve, reject) => {
        const isBot = player2Id === null;
        const scoresJson = scores ? JSON.stringify(scores) : null;
        const finalWinnerId = (winnerId === -1 || (isBot && winnerId === null)) ? null : winnerId;

        fastify.db.serialize(() => {
          fastify.db.run("BEGIN EXCLUSIVE TRANSACTION");

          fastify.db.run(
            `INSERT INTO matches (player1_id, player2_id, winner_id, is_bot, bot_difficulty, scores, match_type) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [player1Id, player2Id, finalWinnerId, isBot ? 1 : 0, botDifficulty || null, scoresJson, matchType],
            function (err: any) {
              if (err) {
                fastify.recentSaves?.delete(baseKey);
                fastify.log.error("Erreur sauvegarde match:", err);
                fastify.db.run("ROLLBACK");
                reject(err);
                return;
              }

              const matchId = this.lastID;
              fastify.log.info(`Match sauvegarde ID: ${matchId} (P1=${player1Id}, P2=${player2Id}, Winner=${winnerId}, Bot=${isBot}, Type=${matchType})`);

              // Update stats inline to ensure they are in the transaction
              const p1Column = winnerId === player1Id ? "wins" : "losses";
              fastify.db.run(`UPDATE users SET ${p1Column} = ${p1Column} + 1 WHERE id = ?`, [player1Id], (err: any) => {
                if (err) {
                  fastify.log.error("Erreur update stats P1:", err);
                  fastify.db.run("ROLLBACK");
                  reject(err);
                  return;
                }

                if (player2Id) {
                  const p2Column = winnerId === player2Id ? "wins" : "losses";
                  fastify.db.run(`UPDATE users SET ${p2Column} = ${p2Column} + 1 WHERE id = ?`, [player2Id], (err: any) => {
                    if (err) {
                      fastify.log.error("Erreur update stats P2:", err);
                      fastify.db.run("ROLLBACK");
                      reject(err);
                      return;
                    }
                    fastify.db.run("COMMIT");
                    fastify.log.info(`Stats updated for match ${matchId}`);
                    resolve();
                  });
                } else {
                  fastify.db.run("COMMIT");
                  fastify.log.info(`Stats updated for match ${matchId}`);
                  resolve();
                }
              });
            }
          );
        });
      });
    }).finally(() => {
      setTimeout(() => {
        const baseKey = `${player1Id}-${player2Id || 'bot'}-${winnerId}`;
        fastify.recentSaves?.delete(baseKey);
      }, 2000);
    });
  });

  fastify.get("/api/match-history/:userId", async (request: any, reply: any) => {
    const decoded = verifyToken(request, reply);
    if (!decoded) return;
    const { userId } = request.params;
    const { page = 1, limit = 10 } = request.query;
    const offset = (page - 1) * limit;

    return new Promise((resolve, reject) => {
      // TODO: Verifier que la table 'matches' contient les colonnes: is_bot, bot_difficulty, scores, match_type
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
            fastify.log.error("erreur recuperation historique:", err);
            reply.code(500).send({ error: "erreur serveur" });
            reject(err);
          } else {
            const matches = rows.map(match => {
              return {
                ...match,
                scores: match.scores ? JSON.parse(match.scores) : null,
                matchType: match.match_type || 'quick',
                opponent: match.is_bot === 1
                  ? { name: `Bot (${match.bot_difficulty})`, avatar: "/avatars/bot.png", isBot: true }
                  : match.player1_id === parseInt(userId)
                    ? { name: match.player2_name || 'joueur inconnu', avatar: match.player2_avatar || '/avatars/avatar1.png', isBot: false }
                    : { name: match.player1_name || 'joueur inconnu', avatar: match.player1_avatar || '/avatars/avatar1.png', isBot: false },
                isWinner: match.winner_id === parseInt(userId),
                date: new Date(match.played_at).toISOString()
              };
            });
            resolve(matches);
          }
        }
      );
    });
  });

  fastify.get("/api/user-stats/:userId", async (request: any, reply: any) => {
    const decoded = verifyToken(request, reply);
    if (!decoded) return;
    const { userId } = request.params;

    return new Promise((resolve, reject) => {
      // TODO: Verifier que la table 'users' contient la colonne 'tournaments_won'
      // TODO: Verifier que la table 'matches' contient les colonnes 'is_bot'
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
            fastify.log.error("Erreur recuperation stats:", err);
            reply.code(500).send({ error: "Erreur serveur" });
            reject(err);
          } else if (!row) {
            reply.code(404).send({ error: "Utilisateur non trouve" });
            reject(new Error("User not found"));
          } else {
            const stats = {
              totalGames: row.total_games || 0,
              wins: row.wins || 0,
              losses: row.losses || 0,
              winRate: row.total_games > 0 ? Math.round((row.wins / row.total_games) * 100) : 0,
              botWins: row.bot_wins || 0,
              playerWins: row.player_wins || 0,
              tournamentsWon: row.tournaments_won || 0
            };
            resolve(stats);
          }
        }
      );
    });
  });
});
