import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { request } from 'http';

const fastify = Fastify({
    logger: {
        transport: {
            target: "pino-pretty",
        },
    },
});

const db = (await import(path.join(__dirname, '..', 'index.js'))).default;
const crypto = require('crypto');

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

fastify.post('/verify-2fa', async (request, reply) => {
    const {userId, code } = request.body as {
        userId: number;
        code: string;
    }
})