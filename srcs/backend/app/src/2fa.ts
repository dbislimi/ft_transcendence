import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

const db = (await import(path.join(__dirname, '..', 'index.js'))).default;
const crypto = require('crypto');

function GenerateOtp(){
    return crypto.randomInt(100000, 999999).toString();
}

async function Send2faMail() {
    const otp = GenerateOtp();
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
        user: 'Transcendance06000@gmail.com',
        pass: 'rwyw lblj tslg ueyy ',
        },
    });

    const Message = {
        from: '"TEST" <Transcendance06000@gmail.com',
        to: 'poymail',//le mail du poy a recup dans la db ?
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