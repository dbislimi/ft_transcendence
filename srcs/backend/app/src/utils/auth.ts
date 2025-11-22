import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined in environment variables');
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
  const authHeader = ((request as any).raw?.headers as any)?.authorization as string | undefined;
  
  if (!authHeader?.startsWith("Bearer ")) {
    reply.log.warn("Header Authorization manquant ou malformé");
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
    reply.log.error("Erreur de vérification JWT:", {
      error: error instanceof Error ? error.message : String(error),
      tokenExists: !!authHeader
    });
    return null;
  }
}

export function verifyTokenFromQuery(token: string): { id: number; name?: string; email?: string } | null {
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
      tokenLength: token.length
    });
    return null;
  }
}

export default fp(async function authPlugin(fastify: FastifyInstance<any, any, any, any, any>) {
  fastify.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    const decoded = verifyToken(req, reply);
    if (!decoded) {
      return reply.code(401).send({ error: "Token invalide ou manquant" });
    }
    req.user = decoded;
  });
});
