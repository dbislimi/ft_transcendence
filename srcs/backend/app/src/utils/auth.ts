import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET non défini");
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user?: { id: number; name?: string; email?: string };
  }
}

export function verifyToken(
  request: FastifyRequest,
  reply: FastifyReply
): { id: number; name?: string; email?: string } | null {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
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
  } catch {
    return null;
  }
}

export default fp(async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    const decoded = verifyToken(req, reply);
    if (!decoded) {
      return reply.code(401).send({ error: "Token invalide ou manquant" });
    }
    req.user = decoded;
  });
});
