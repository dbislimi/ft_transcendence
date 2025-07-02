import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import Game from "../game/Game.ts";
import type WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import type { FastifyPluginAsync } from "fastify";
import { Games } from "../game/Games.ts";

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
		opt: { type: "string", enum: ["online", "offline"] },
	},
	required: ["opt"],
};

type HandlerKey = 'online' | 'offline';

interface Params {
	opt: HandlerKey;
}

const handlers = {
	online: (socket: WebSocket, Games: Games) => {
		return Games.startOnline(socket);
	},
	offline: () => { return {playerId: 1, gameId: 1}}
};

const gameController: FastifyPluginAsync<{ prefix?: string }> = async (
	fastify: FastifyInstance,
	options
) => {
	const games: Games = new Games();
	fastify.get(
		"/:opt",
		{ websocket: true, schema: { params: paramsSchema } },
		(socket: WebSocket, req: FastifyRequest<{ Params: Params }>) => {
			const opt: HandlerKey = req.params.opt;
			
			const { playerId, gameId } = handlers[opt](socket, games);
		
			socket.on("message", (message) => {
				const msg = JSON.parse(message.toString());
				//console.log(msg);
				if (msg.event === "start") games.getRoom(gameId).start();
				else if (msg.event === "stop") games.getRoom(gameId).pause();
				else if (msg.event === "up") games.getRoom(gameId).up(msg.type, playerId);
				else if (msg.event === "down") games.getRoom(gameId).down(msg.type, playerId);
				else if (msg.event === "restart") {
					games.removeRoom(gameId);
				}
			});
			socket.on("close", () => {
				console.log("close ", socket);
				games.getRoom(gameId).pause();
				games.removeRoom(gameId);
			});
		}
	);
};

export default fp(gameController);
