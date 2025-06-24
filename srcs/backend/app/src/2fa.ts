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