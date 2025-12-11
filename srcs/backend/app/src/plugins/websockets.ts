import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import gameController from "./gameController.js";
import chat from "./chat.js";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
	throw new Error("JWT_SECRET must be defined in environment variables");
}

if (!JWT_SECRET) {
	throw new Error("JWT_SECRET must be defined in environment variables");
}

interface Tournament {
	tournamentId: string;
}

export interface Client {
	id: number;
	name: string;
	socket?: any;
	tournament?: Tournament;
	inGameId?: 0 | 1;
	winnerTimer?: ReturnType<typeof setTimeout>;
	quit?: boolean;
}

const wsController: FastifyPluginAsync<{ prefix?: string }> = async (
	fastify,
	options
) => {
	console.log("wsController plugged");
	if (!JWT_SECRET) {
		console.log(`JWT SECRET issue`);
		return;
	}
	console.log("JWT OK");
	fastify.decorate("clients", new Map<number, Client>());
	fastify.decorate("guestIdCounter", 0);
	fastify.decorate("findClientByName", (name: string): Client | null => {
		for (const client of fastify.clients.values())
			if (client.name === name) return client;
		return null;
	});
	fastify.decorate("findClientById", (id: number): Client | null => {
		return fastify.clients.get(id) || null;
	});
	fastify.decorate(
		"getClient",
		(
			req: FastifyRequest<{ Querystring: { token?: string } }>,
			socket: any
		): Client | null => {
			try {
				const token = req.query?.token;
				if (!token) {
					const guestId = --fastify.guestIdCounter;
					const guestName = `Guest${Math.abs(guestId)}`;
					console.log("Nouvelle connexion guest");
					const client: Client = {
						id: guestId,
						name: guestName,
						socket,
					};
					fastify.clients.set(guestId, client);
					return client;
				}

				const decoded = jwt.verify(token, JWT_SECRET) as {
					id: number;
					display_name: string;
					email: string;
				};
				let client = fastify.clients.get(decoded.id);
				if (client) {
					console.log("Changement de socket");
					if (client.removalTimer) {
						clearTimeout(client.removalTimer);
						client.removalTimer = undefined;
					}
					client.socket = socket;
					client.id = decoded.id;
				} else {
					console.log("Nouvelle connexion");
					client = {
						id: decoded.id,
						name: decoded.display_name,
						socket,
					};
					fastify.clients.set(decoded.id, client);
				}
				return client;
			} catch (e) {
				console.log(`JWT: ${e}`);
				return null;
			}
		}
	);
	fastify.register(chat);
	fastify.register(gameController);
};

export default fp(wsController);
