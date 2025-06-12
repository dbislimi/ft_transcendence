import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import Game from "../game/types.ts";
import type WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";

type IGames = Record<string, Game>;

const wsGame = async (fastify: FastifyInstance) => {
	let games: IGames = {};
	fastify.get("/ws/game", { websocket: true }, (socket: WebSocket, req) => {
		const uid = uuidv4();
		games[uid] = new Game(socket);
		socket.on("message", (message) => {
			console.log(uid);
			const msg: string = message.toString();
			if (msg === "start") games[uid].start();
			if (msg === "stop") games[uid].stop();
		});
	});
};

export default fp(wsGame);
