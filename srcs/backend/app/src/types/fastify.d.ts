import type { FastifyReply, FastifyRequest } from "fastify";
import type { Client } from "../plugins/websockets.js";

declare module "fastify" {
	interface FastifyInstance {
		// Database handle
		db: any;

		// WebSocket clients registry
		clients: Map<number, Client>;

		// Decorated helpers
		getClient(req: FastifyRequest, socket: any): Client | null;
		authenticate: (
			req: FastifyRequest,
			reply: FastifyReply
		) => Promise<void>;
		// Custom app decorators
		generateOtp: () => string;
		send2faEmail: (email: string, code: string) => Promise<boolean>;
		broadcastFriends: (message: any, friendIds: number[]) => void;
		transcendance?: any;
	}

	interface FastifyRequest {


		// Filled by authenticate decorator
		user?: { id: number; name?: string; email?: string };
	}
}
