import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Database } from "sqlite3";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
	throw new Error("JWT_SECRET non defini");
}

async function getUserDisplayName(
	db: Database,
	userId: number
): Promise<string | undefined> {
	return new Promise((resolve, reject) => {
		db.get(
			"SELECT display_name FROM users WHERE id = ?",
			[userId],
			(err, row: any) => {
				if (err) {
					reject(err);
				} else {
					resolve(row?.display_name);
				}
			}
		);
	});
}

export async function verifyToken(
	request: FastifyRequest,
	reply: FastifyReply
): Promise<{ id: number; name?: string; email?: string } | null> {
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

		const db = (request.server as any).db;
		if (db) {
			try {
				const displayName = await getUserDisplayName(db, decoded.id);
				if (displayName) {
					decoded.name = displayName;
				}
			} catch (dbError) {
				reply.log.warn(
					{ error: dbError, userId: decoded.id },
					"Erreur lors de la récupération du display_name depuis la DB"
				);
			}
		}

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

export async function verifyTokenFromQuery(
	token: string,
	db?: Database
): Promise<{ id: number; name?: string; email?: string } | null> {
	try {
		const decoded = jwt.verify(token, JWT_SECRET) as {
			id: number;
			name?: string;
			email?: string;
		};

		if (db) {
			try {
				const displayName = await getUserDisplayName(db, decoded.id);
				if (displayName) {
					decoded.name = displayName;
				}
			} catch (dbError) {
				console.warn(
					"Erreur lors de la récupération du display_name depuis la DB:",
					dbError,
					"userId:",
					decoded.id
				);
			}
		}

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
