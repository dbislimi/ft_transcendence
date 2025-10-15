import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import util from "util";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";

const Settings = async (fastify: FastifyInstance) => {
  fastify.get('/reglages', async (request, reply) => {
  if (!request.user) {
    return reply.code(401).send({ error: 'Non autorisé' });
  }

  try {
    const dbGet = util.promisify(fastify.db.get.bind(fastify.db));
    const user = await dbGet('SELECT twoFAEnabled FROM users WHERE id = ?', [request.user.id]);

    if (!user) {
      return reply.code(404).send({ error: 'Utilisateur introuvable' });
    }

    return reply.send({ twoFAEnabled: !!user.twoFAEnabled });
  } catch (err) {
    console.error('Erreur GET /reglages :', err);
    return reply.code(500).send({ error: 'Erreur serveur' });
  }
});

  fastify.post('/reglages', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Non autorisé' });
    }

    const { enable2fa } = request.body as { enable2fa: boolean };
    const dbRun = util.promisify(fastify.db.run.bind(fastify.db));

    try {
      console.log("TWO FA DE LA DB : " + enable2fa);
      await dbRun(
        'UPDATE users SET twoFAEnabled = ? WHERE id = ?',
        [enable2fa ? 1 : 0, request.user.id]
      );
      console.log("TWO FA DE LA DB : " + enable2fa);
      return reply.send({ success: true, twoFAEnabled: enable2fa });
    } catch (err) {
      console.error('Erreur /reglages :', err);
      return reply.code(500).send({ error: 'Erreur serveur' });
    }
  });
}

export default fp(Settings);