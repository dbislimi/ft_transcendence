import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export default fp(async function userPlugin(fastify: FastifyInstance) {
  fastify.get('/profile', async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Token manquant' });
    }

    try {
      const token = authHeader.split(' ')[1];
      console.log("azy l'ancien il est vite fait ton token " + token);
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; name: string };
      console.log("azy l'ancien il est vite fait ton code de con ");
      return reply.send({ message: `Bonjour ${decoded.name}` });
    } catch (err) {
      console.log("MAIS ME DIS MEME PAS CA VIENT DE LA ");
      return reply.code(401).send({ error: 'Token invalide ou expiré' });
    }
  });

  fastify.get('/me', async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Token manquant' });
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };

      fastify.db.get(
        'SELECT id, name, email, twoFAEnabled FROM users WHERE id = ?',
        [decoded.id],
        (err, user) => {
          if (err || !user) {
            return reply.code(404).send({ error: 'Utilisateur introuvable' });
          }

          return reply.send(user);
        }
      );
    } catch (err) {
      return reply.code(401).send({ error: 'Token invalide ou expiré' });
    }
  });
});
