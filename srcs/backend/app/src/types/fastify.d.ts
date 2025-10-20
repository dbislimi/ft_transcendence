declare module "fastify" {
  interface FastifyInstance {
	db: any;
    clients: Map<number, Client>;
    games: GamesManager;
	getClient(req: FastifyRequest, socket: WebSocket): Client | null;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
	cookies: { [cookieName: string]: string };
  }
}