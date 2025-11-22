import path from 'path';
import { fileURLToPath } from 'url';
import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { request } from 'http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import util from 'util';
import fp from 'fastify-plugin';


dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export function GenerateOtp(){
    return crypto.randomInt(100000, 999999).toString();
}

export default fp(async function Send2faPlugin(fastify: FastifyInstance) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'Transcendance06000@gmail.com',
      pass: 'rwyw lblj tslg ueyy',
    },
  });

  fastify.decorate('send2faEmail', async (email: string, otp: string) => {
    const message = {
      from: '"2FA Service" <Transcendance06000@gmail.com>',
      to: email,
      subject: 'Votre code de verification',
      text: `Votre code est : ${otp}`,
    };

    try {
      await transporter.sendMail(message);
      return true;
    } catch (error) {
      fastify.log.error('Erreur lors de l\'envoi du mail:', error);
      return false;
    }
  });

  fastify.post('/check2fa', async (request, reply) => {
    const { userId, code } = request.body as { userId: number; code: string };
  
  try {
    const dbGet = util.promisify(fastify.db.get.bind(fastify.db));
    const dbRun = util.promisify(fastify.db.run.bind(fastify.db));
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user) {
      return reply.code(401).send({ error: 'Utilisateur non trouve' });
    }

    if (user.twoFAOtp !== code) {
      return reply.code(401).send({ error: 'Code incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    await dbRun('UPDATE users SET twoFAOtp = NULL WHERE id = ?', [user.id]);

    return reply.send({ success: true, token });
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ error: 'Erreur serveur' });
  }
});

  fastify.decorate('generateOtp', GenerateOtp);
});
