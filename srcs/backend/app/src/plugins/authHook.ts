import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export default fp(async function authHook(fastify: FastifyInstance) {
  fastify.addHook("onRequest", async (request: FastifyRequest, reply) => {
    const authHeader = request.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
          id: number;
          name: string;
          email: string;
        };
      request.user = decoded;
      } catch (err) {
        console.warn("Token invalide :", err);
      }
    }
  });
});