declare module "fastify" {
  interface FastifyInstance {
    db: any;
    clients: Map<number, Client>;
    // extension pour track les clients ws par id
    getClient(req: FastifyRequest, socket: WebSocket): Client | null;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    // extension pour get les cookies dans les routes
    cookies: { [cookieName: string]: string };
  }
}
