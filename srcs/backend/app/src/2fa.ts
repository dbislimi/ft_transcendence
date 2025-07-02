import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { request } from 'http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv' 
import crypto from 'crypto'


const fastify = Fastify({
    logger: {
        transport: {
            target: "pino-pretty",
        },
    },
});

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = (await import(path.join(__dirname, '..', 'index.js'))).default;


export function GenerateOtp(){
    return crypto.randomInt(100000, 999999).toString();
}

export async function Send2faMail(email: string, otp: string) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
        user: 'Transcendance06000@gmail.com',
        pass: 'rwyw lblj tslg ueyy ',
        },
    });

    const Message = {
        from: '"TEST" <Transcendance06000@gmail.com',
        to: email,
        subject: 'votre code a 6 chiffres:',
        text: 'code : ' + otp,
    };
    try {
        let info = await transporter.sendMail(Message);
        console.log('Email envoyé : %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Erreur lors de l"envoi du mail:', error);
        return false;
    }
}

fastify.post('/check2fa', async (request, reply) => {
    const {userId, code } = request.body as {
        userId: number;
        code: string;
    };

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err: any, user: any) => {
    if (err) {
      return reply.code(500).send({ error: 'Erreur serveur' });
    }
    if (!user) {
      return reply.code(401).send({ error: 'Utilisateur non trouvé' });
    }
    if (user.twoFAOtp !== code){
        return reply.code(401).send({error : 'code incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    db.run('UPDATE users SET twoFAOtp = NULL WHERE id = ?', [user.id]);

    return reply.send({success: true, token});
    });
});

fastify.post('/reglages', async (request, reply) => {
    
})