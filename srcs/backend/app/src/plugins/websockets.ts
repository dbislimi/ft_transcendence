import fp from "fastify-plugin";
import WebSocket from "ws";
import jwt from "jsonwebtoken";
import type { FastifyPluginAsync } from "fastify";
import GamesManager from "../pong/GamesManager.ts";
import websocket from "@fastify/websocket";
import gameController from "./gameController.ts";
import chat from "./chat.ts";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined in environment variables');
}

interface Tournament {
    tournamentId: string;
    allowReconnect: boolean;
}
export interface Client {
    id: number;
    name: string;
    socket?: WebSocket;
    tournament?: Tournament;
    inGameId?: 0 | 1;

    quit?: boolean;
    winnerTimer?: ReturnType<typeof setTimeout>;

    rejoinTimer?: ReturnType<typeof setTimeout>;
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
		(req: any, socket: WebSocket): Client | null => {
            try {
                // token peut etre dans query, url ou header
                let token: string | undefined | null = undefined;
                if (req.query && req.query.token) token = req.query.token;
                if (!token && req.url && typeof req.url === "string") {
                    try {
                        const fake = `http://localhost${req.url}`;
                        const u = new URL(fake);
                        token = u.searchParams.get("token");
                    } catch (e) {
                        // ignore parse errors
                    }
                }
                // As a last resort, accept Bearer token in Authorization header
                if (!token && req.headers && req.headers.authorization) {
                    const auth = (req.headers.authorization as string) || "";
                    if (auth.startsWith("Bearer ")) token = auth.split(" ")[1];
                }
                if (!token) {
                    fastify.log.warn(`WS auth failed: no token provided (url=${req.url})`);
                    return null;
                }

                const decoded = jwt.verify(token, JWT_SECRET) as {
                    id: number;
                    name?: string;
                    display_name?: string;
                };
                // Support both "name" and "display_name" fields
                const userName = decoded.display_name || decoded.name || `User_${decoded.id}`;
                
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
                    client = { id: decoded.id, name: userName, socket } as Client;
                    fastify.clients.set(decoded.id, client);
                }
                return client;
            } catch (e) {
                console.log(`JWT: ${e}`);
                return null;
            }
        }
    );
	await fastify.register(gameController);
    await fastify.register(chat);
};

export default fp(wsController);
