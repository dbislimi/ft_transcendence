import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import Game from "../game/Game.ts";
import type WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import type { FastifyPluginAsync } from "fastify";

type games = Record<string, Game>;

const responseSchema = {
	204: { type: "null" },
	404: {
		type: "object",
		properties: {
			error: { type: "string" },
		},
		required: ["error"],
	},
};

const paramsSchema = {
	type: "object",
	properties: {
		opt: { type: 'string', enum: ['online', 'friend', 'solo'] },
	},
	required: ["opt"],
};

interface Params {
	opt: string;
}

const handlers = {
	online: (socket: WebSocket, onlineGames: games) => {
		socket.send(JSON.stringify({event: 'searching'}));
		while (onlineGames.size == 0 ||)
	}
}

const gameController: FastifyPluginAsync<{ prefix?: string }> = async (
	fastify: FastifyInstance,
	options
) => {
	let games: games = {};
	let onlineGames: games = {};

	fastify.get(
		"/:opt",
		{ websocket: true, schema: { params: paramsSchema } },
		(socket: WebSocket, req: FastifyRequest<{ Params: Params }>) => {
			const opt = req.params.opt;

			const uid = uuidv4().slice(0, 8);
			console.log(uid);
			games[uid] = new Game(socket);
			socket.on("message", (message) => {
				const msg = JSON.parse(message.toString());
				//console.log(msg);
				if (msg.event === "start") games[uid].start();
				else if (msg.event === "stop") games[uid].pause();
				else if (msg.event === "up") games[uid].up(msg.type);
				else if (msg.event === "down") games[uid].down(msg.type);
				else if (msg.event === "restart") {
					delete games[uid];
					games[uid] = new Game(socket);
				}
			});
			socket.on("close", () => {
				console.log("close ", uid);
				games[uid].pause();
				delete games[uid];
			});
		}
	);
};

export default fp(gameController);
