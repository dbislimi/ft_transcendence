import { fastify } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";

const Settings = async (fastify: fastify) => {
  fastify.post('/reglages', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Non autorisé' });
    }

    const { enable2fa } = request.body as { enable2fa: boolean };
    const dbRun = util.promisify(db.run.bind(db));

    try {
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