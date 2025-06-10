import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import game from "../game/pong.ts";

const wsGame = async (fastify: FastifyInstance) => {
  fastify.get("/ws/game", { websocket: true }, (socket, req) => {
    game(socket);
    socket.on("message", (message) => {
      socket.send(message);
    });
  });
};

export default fp(wsGame);
