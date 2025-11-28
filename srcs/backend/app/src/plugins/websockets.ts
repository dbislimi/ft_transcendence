import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import gameController from "./gameController.ts";
import chat from "./chat.ts";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

interface Tournament {
	tournamentId: string;
	allowReconnect: boolean;
}

interface Cosmetics {
	preferredSide: string;
	paddleColor: string;
	ballColor: string;
}

export interface Client {
	id: number;
	name: string;
	socket?: any;
	tournament?: Tournament;
	inGameId?: 0 | 1;
	winnerTimer?: ReturnType<typeof setTimeout>;
	rejoinTimer?: ReturnType<typeof setTimeout>;
	quit?: boolean;
	cosmetics?: Cosmetics;
	removalTimer?: ReturnType<typeof setTimeout>;
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
					// Create guest client
					const guestId = --fastify.guestIdCounter; // Negative IDs for guests
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
				name: string;
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
					name: decoded.name,
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

	fastify.register(gameController);
	fastify.register(chat);
};

export default fp(wsController);
