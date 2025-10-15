import type { FastifyInstance } from 'fastify';
import fastifyOauth2 from '@fastify/oauth2';
import fp from 'fastify-plugin';
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';


dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;

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
    callbackUri: 'http://localhost:3000/auth/google/callback',
    scope: ['profile', 'email'],
    });

    fastify.get('/auth/google/callback', async function (req, reply) {
      if (!req.query.code) {
        return reply.send('Erreur : code manquant depuis Google');
      }
    
    const result = await fastify.transcendance.getAccessTokenFromAuthorizationCodeFlow(req);

    const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: 'Bearer ' + result.token.access_token
      },
    }).then(res => res.json());
    console.log("AH LES INFO QUON A DE GOOGLE: ", userInfo);
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
        db.run(
          'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
          [name, email, null],
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

      return reply.redirect(`http://localhost:5173?require2fa=${user.twoFAEnabled}`);
      }

    const jwtToken = jwt.sign(
      { id: user.id, name: user.name, email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return reply.redirect(`http://localhost:5173?token=${jwtToken}`);
    });
});

//jcrois mtn faut juste tu recup le token que t'envoie dans le front en sah mais azy tema vite fait si t'a pas un chemin en plus a retirer du hook