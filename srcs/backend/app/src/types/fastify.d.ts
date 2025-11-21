declare module "fastify" {
  interface FastifyInstance {
	db: any;
    clients: Map<number, Client>;
	// extension pour gerer les clients websocket par id
	getClient(req: FastifyRequest, socket: WebSocket): Client | null;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
	// extension pour acceder aux cookies depuis les routes
	cookies: { [cookieName: string]: string };
  }
}
