import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
	throw new Error("JWT_SECRET non defini");
}

// user typing is declared in module augmentation at src/types/fastify.d.ts

export function verifyToken(
	request: FastifyRequest,
	reply: FastifyReply
): { id: number; name?: string; email?: string } | null {
	const authHeader = request.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		reply.log.warn("Header Authorization manquant ou malforme");
		return null;
	}
	try {
		const token = authHeader.split(" ")[1];
		const decoded = jwt.verify(token, JWT_SECRET) as {
			id: number;
			name?: string;
			email?: string;
		};
		return decoded;
	} catch (error) {
		reply.log.error(
			{
				error: error instanceof Error ? error.message : String(error),
				tokenExists: !!authHeader,
			},
			"Erreur de verification JWT"
		);
		return null;
	}
}

export function verifyTokenFromQuery(
	token: string
): { id: number; name?: string; email?: string } | null {
	try {
		const decoded = jwt.verify(token, JWT_SECRET) as {
			id: number;
			name?: string;
			email?: string;
		};
		return decoded;
	} catch (error) {
		console.error("Token JWT invalide depuis query:", {
			error: error instanceof Error ? error.message : String(error),
			tokenPreview: token.substring(0, 20) + "...",
			tokenLength: token.length,
		});
		return null;
	}
}

export default fp(async function authPlugin(fastify: FastifyInstance) {
	fastify.decorate(
		"authenticate",
		async (req: FastifyRequest, reply: FastifyReply) => {
			const decoded = verifyToken(req, reply);
			if (!decoded) {
				return reply
					.code(401)
					.send({ error: "Token invalide ou manquant" });
			}
			req.user = decoded;
		}
	);
});
