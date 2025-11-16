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
                    name: string;
                };
                let client = fastify.clients.get(decoded.id);
                if (client) {
                    console.log("Changement de socket");
                    client.socket = socket;
                } else {
                    console.log("Nouvelle connexion");
                    client = { id: decoded.id, name: decoded.name, socket } as Client;
                    fastify.clients.set(decoded.id, client);
                }
                return client;
            } catch (e) {
                const errorMsg = e instanceof Error ? e.message : String(e);
                console.error(`[WS Auth Error] JWT verification failed: ${errorMsg} (url=${req.url})`);
                fastify.log.error(`WS JWT verification failed: ${errorMsg}`);
                return null;
            }
        }
    );

    fastify.register(websocket);
    fastify.register(gameController);
    fastify.register(chat);
};

export default fp(wsController);
