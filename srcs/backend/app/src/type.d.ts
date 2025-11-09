import "fastify";
import sqlite3 from "sqlite3";
import type { Client } from "./plugins/websockets.ts";

declare module "fastify" {
	interface FastifyInstance {
		db: sqlite3.Database;
		clients: Map<number, Client>;
		getClient(req: FastifyRequest, socket: WebSocket): Client | null;
		findClientByName(name: string): Client | null;
		findClientById(id: number): Client | null;
	}
}
