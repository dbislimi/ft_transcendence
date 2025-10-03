import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export default fp(async function leaderboardPlugin(fastify: FastifyInstance) {
  fastify.get('/leaderboard', async (request, reply) => {
    try {
      const rows = await new Promise<any[]>((resolve, reject) => {
        fastify.db.all(
          `
          SELECT display_name, wins, losses, 
            (wins * 3 - losses) AS score
          FROM users
          ORDER BY score DESC
          LIMIT 10
          `,
          [],
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
});
