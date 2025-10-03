import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { verifyToken } from '../utils/auth.ts';

export default fp(async function matchesPlugin(fastify: FastifyInstance) {
  fastify.get('/my-matches', async (request, reply) => {
    const decoded = verifyToken(request, reply);
    if (!decoded) return;

    try {
      const rows = await new Promise<any[]>((resolve, reject) => {
        fastify.db.all(
          `SELECT * FROM matches WHERE player1_id = ? OR player2_id = ?`,
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
});
