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
		console.log(uid);
		games[uid] = new Game(socket);
		socket.on("message", (message) => {
			const msg = JSON.parse(message.toString());
			//console.log(msg);
			if (msg.event === "start") games[uid].start();
			else if (msg.event === "stop") games[uid].stop();
			else if (msg.event === "mouse") games[uid].setBall((msg.x - 80) / 4, (msg.y - 124) / 4);
			else if (msg.event === 'up') games[uid].up(msg.type);
			else if (msg.event === "down") games[uid].down(msg.type);
		});
		socket.on("close", () => {
			console.log("close ", uid);
			games[uid].stop();
			delete games[uid];
		})
	});
};

export default fp(wsGame);
