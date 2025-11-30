import type { FastifyInstance } from 'fastify';
import fastifyOauth2 from '@fastify/oauth2';
import fp from 'fastify-plugin';
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in environment variables');
}
const HOSTNAME = process.env.HOSTNAME || 'localhost';

export default fp(async function GoogleAuth(fastify: FastifyInstance) {

  fastify.register(fastifyOauth2, {
    name: 'transcendance',
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID!,
        secret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      auth: fastifyOauth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/auth/google',
    callbackUri: `https://localhost:8443/api/auth/google/callback`,
    scope: ['profile', 'email'],
    checkStateFunction: () => true,
    generateStateFunction: () => 'stateless'
  });

  fastify.get('/auth/google/callback', async function (req, reply) {

    if (!req.query.code) {
      return reply.send('Erreur : code manquant depuis Google');
    }

    let result;
    try {
      result = await fastify.transcendance.getAccessTokenFromAuthorizationCodeFlow(req);
    } catch (err) {
      console.error('[Google Callback] Token Exchange Error:', err);
      return reply.code(400).send({ error: "Session expiree ou invalide. Veuillez reessayer de vous connecter." });
    }

    const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: 'Bearer ' + result.token.access_token
      },
    }).then(res => res.json());
    const { email, name } = userInfo;

    const db = fastify.db;
    let user = await new Promise<any>((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      const lastID = await new Promise<number>((resolve, reject) => {
        const dummyPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

        db.run(
          'INSERT INTO users (name, email, password, display_name, avatar) VALUES (?, ?, ?, ?, ?)',
          [userInfo.name, userInfo.email, dummyPassword, userInfo.name, '/avatars/avatar1.png'],
          function (err) {
            if (err)
              reject(err);
            else
              resolve(this.lastID);
          }
        );
      });

      user = { id: lastID, name, email };
    }
    if (user.twoFAEnabled === 1) {
      const otp = fastify.generateOtp();

      await new Promise<void>((resolve, reject) => {
        db.run(
          'UPDATE users SET twoFAOtp = ? WHERE id = ?',
          [otp, user.id],
          (err: any) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      const emailSent = await fastify.send2faEmail(user.email, otp);
      if (!emailSent) {
        return reply.code(500).send({ error: "Erreur lors de l'envoi de l'e-mail" });
      }

      return reply.redirect(`https://${HOSTNAME}:8443/google-callback?require2fa=${user.twoFAEnabled}&userId=${user.id}`);
    }

    const jwtToken = jwt.sign(
      { id: user.id, email, display_name: user.display_name },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    return reply.redirect(`https://${HOSTNAME}:8443/google-callback?token=${jwtToken}`);
  });
});
