import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
	throw new Error("JWT_SECRET must be defined in environment variables");
}

export default fp(async function authHook(fastify: FastifyInstance) {
	fastify.addHook("onRequest", async (request: FastifyRequest, reply) => {
		// Exclude public/auth routes and WebSocket endpoints used for BombParty and Game
		const excludedRoutes = [
			"/login",
			"/register",
			"/check-user",
			"/check2fa",
			"/auth/google",
			"/auth/google/callback",
			"/chat", // WebSocket chat endpoint (auth handled by getClient in websockets.ts)
			"/game", // WebSocket Pong endpoint (auth handled by getClient in websockets.ts)
			"/ws-friends", // WebSocket friends endpoint (auth handled in ws-friends.ts)
			"/bombparty",
			"/bomb-party", // Bomb Party API routes (auth handled by preHandler in statsRoutes.ts)
			"/api/bomb-party", // Bomb Party API routes (auth handled by preHandler in statsRoutes.ts)
			"/logout", // Logout endpoint (handles its own token verification/cleanup)
			"/avatars/custom",
		];

		const rawUrl =
			(request.raw && (request.raw.url as string)) ||
			(request.url as string) ||
			"";
		if (excludedRoutes.some((path) => rawUrl.startsWith(path))) return;

		const authHeader = (request.raw &&
			(request.raw.headers as any)?.authorization) as string | undefined;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			fastify.log.warn(
				{
					url: rawUrl,
					hasAuthHeader: !!authHeader,
					authHeaderPrefix: authHeader?.substring(0, 10),
				},
				"Header Authorization manquant ou malformé"
			);
			return reply.code(401).send({ error: "token manquant" });
		}

		if (authHeader.startsWith("Bearer ")) {
			const token = authHeader.split(" ")[1];
			try {
				const decoded = jwt.verify(token, JWT_SECRET) as {
					id: number;
					display_name: string;
					email: string;
				};
				// attach decoded user to request (fastify extended type)
				(request as any).user = decoded;
			} catch (err) {
				console.warn("Token invalide :", err);
			}
		}
	});
});
