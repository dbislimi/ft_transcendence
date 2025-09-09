import fp from "fastify-plugin";
import type { FastifyInstance } from 'fastify';
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

interface Client {
    id: number;
    name: string;
    socket: any;
}

export default fp(async function Chat(fastify: FastifyInstance) {
    const clients: Client[] = [];
})