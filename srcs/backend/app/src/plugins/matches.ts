import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { verifyToken } from '../utils/auth.ts';

export default fp(async function matchesPlugin(fastify: FastifyInstance<any, any, any, any, any>) {
  
  // Récupérer l'historique des matchs de l'utilisateur
  fastify.get('/my-matches', async (request, reply) => {
    const decoded = verifyToken(request, reply);
    if (!decoded) return;

    try {
      const rows = await new Promise<any[]>((resolve, reject) => {
        fastify.db.all(
          `SELECT 
            m.*,
            p1.display_name as player1_name,
            p2.display_name as player2_name,
            w.display_name as winner_name
           FROM matches m
           LEFT JOIN users p1 ON m.player1_id = p1.id
           LEFT JOIN users p2 ON m.player2_id = p2.id
           LEFT JOIN users w ON m.winner_id = w.id
           WHERE m.player1_id = ? OR m.player2_id = ?
           ORDER BY m.played_at DESC`,
          [decoded.id, decoded.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      return reply.send(rows);
    } catch (error) {
      return reply.code(500).send({ error: 'Erreur serveur' });
    }
  });

  // Ajouter un nouveau match (pour quand vous jouez une partie)
  fastify.post('/matches', async (request, reply) => {
    const decoded = verifyToken(request, reply);
    if (!decoded) return;

    const { opponent_id, winner_id, player1_score, player2_score } = request.body as {
      opponent_id: number;
      winner_id: number;
      player1_score?: number;
      player2_score?: number;
    };

    try {
      // Déterminer qui est player1 et player2
      const player1_id = decoded.id;
      const player2_id = opponent_id;

      const matchId = await new Promise<number>((resolve, reject) => {
        fastify.db.run(
          `INSERT INTO matches (player1_id, player2_id, winner_id) VALUES (?, ?, ?)`,
          [player1_id, player2_id, winner_id],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // Mettre à jour les stats des utilisateurs
      await new Promise<void>((resolve, reject) => {
        fastify.db.serialize(() => {
          fastify.db.run("BEGIN TRANSACTION");
          
          // Incrémenter les victoires du gagnant
          fastify.db.run(
            "UPDATE users SET wins = wins + 1 WHERE id = ?",
            [winner_id]
          );
          
          // Incrémenter les défaites du perdant
          const loser_id = winner_id === player1_id ? player2_id : player1_id;
          fastify.db.run(
            "UPDATE users SET losses = losses + 1 WHERE id = ?",
            [loser_id]
          );
          
          fastify.db.run("COMMIT", (err) => {
            if (err) {
              fastify.db.run("ROLLBACK");
              reject(err);
            } else {
              resolve();
            }
          });
        });
      });

      return reply.send({ 
        success: true, 
        matchId,
        message: "Match enregistré avec succès" 
      });
    } catch (error) {
      return reply.code(500).send({ error: 'Erreur serveur' });
    }
  });

  // Récupérer les statistiques de l'utilisateur
  fastify.get('/my-stats', async (request, reply) => {
    const decoded = verifyToken(request, reply);
    if (!decoded) return;

    try {
      const stats = await new Promise<any>((resolve, reject) => {
        fastify.db.get(
          `SELECT 
            wins,
            losses,
            (wins + losses) as total_games,
            CASE 
              WHEN (wins + losses) > 0 
              THEN ROUND((CAST(wins AS FLOAT) / (wins + losses)) * 100, 1)
              ELSE 0 
            END as win_rate
           FROM users WHERE id = ?`,
          [decoded.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      return reply.send(stats);
    } catch (error) {
      return reply.code(500).send({ error: 'Erreur serveur' });
    }
  });

  // Route de test pour ajouter des matchs factices (à supprimer en production)
  fastify.post('/add-test-matches', async (request, reply) => {
    const decoded = verifyToken(request, reply);
    if (!decoded) return;

    try {
      // Créer quelques matchs factices pour tester
      const testMatches = [
        { opponent_id: 2, winner_id: decoded.id }, // Victoire
        { opponent_id: 3, winner_id: 3 }, // Défaite
        { opponent_id: 2, winner_id: decoded.id }, // Victoire
        { opponent_id: 4, winner_id: decoded.id }, // Victoire
        { opponent_id: 3, winner_id: 3 }, // Défaite
      ];

      for (const match of testMatches) {
        await new Promise<void>((resolve, reject) => {
          fastify.db.run(
            `INSERT INTO matches (player1_id, player2_id, winner_id) VALUES (?, ?, ?)`,
            [decoded.id, match.opponent_id, match.winner_id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Mettre à jour les stats
        if (match.winner_id === decoded.id) {
          // Victoire pour l'utilisateur
          await new Promise<void>((resolve, reject) => {
            fastify.db.run(
              "UPDATE users SET wins = wins + 1 WHERE id = ?",
              [decoded.id],
              (err) => err ? reject(err) : resolve()
            );
          });
          // Défaite pour l'adversaire
          await new Promise<void>((resolve, reject) => {
            fastify.db.run(
              "UPDATE users SET losses = losses + 1 WHERE id = ?",
              [match.opponent_id],
              (err) => err ? reject(err) : resolve()
            );
          });
        } else {
          // Défaite pour l'utilisateur
          await new Promise<void>((resolve, reject) => {
            fastify.db.run(
              "UPDATE users SET losses = losses + 1 WHERE id = ?",
              [decoded.id],
              (err) => err ? reject(err) : resolve()
            );
          });
          // Victoire pour l'adversaire
          await new Promise<void>((resolve, reject) => {
            fastify.db.run(
              "UPDATE users SET wins = wins + 1 WHERE id = ?",
              [match.winner_id],
              (err) => err ? reject(err) : resolve()
            );
          });
        }
      }

      return reply.send({ 
        success: true, 
        message: "Matchs de test ajoutés avec succès" 
      });
    } catch (error) {
      return reply.code(500).send({ error: 'Erreur serveur' });
    }
  });
});
