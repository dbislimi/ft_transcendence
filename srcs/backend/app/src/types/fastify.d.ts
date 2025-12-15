import type { FastifyReply, FastifyRequest } from "fastify";
import type { Client } from "../plugins/websockets.js";

declare module "fastify" {
	interface FastifyInstance {
		db: any;
		clients: Map<number, Client>;
		getClient(req: FastifyRequest, socket: any): Promise<Client | null>;
		authenticate: (
			req: FastifyRequest,
			reply: FastifyReply
		) => Promise<void>;
		generateOtp: () => string;
		send2faEmail: (email: string, code: string) => Promise<boolean>;
		broadcastFriends: (message: any, friendIds: number[]) => void;
		transcendance?: any;
	}

	interface FastifyRequest {
		user?: { id: number; name?: string; email?: string };
	}
}
