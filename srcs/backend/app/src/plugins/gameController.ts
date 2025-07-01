import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import Game from "../game/Game.ts";
import type WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import type { FastifyPluginAsync } from "fastify";

type IGames = Record<string, Game>;

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
		id: { type: "string" },
	},
	required: ["id"],
};

interface Params {
	id: string;
}

const gameController: FastifyPluginAsync<{ prefix?: string }> = async (
	fastify: FastifyInstance,
	options
) => {
	let games: IGames = {};
	fastify.get(
		"/:id",
		{ schema: { params: paramsSchema, response: responseSchema } },
		(req: FastifyRequest<{ Params: Params }>, rep) => {
			const id = req.params.id;
			if (id in games) return rep.status(204).send();
			else return rep.status(404).send({ error: "Party not found." });
		}
	);
	fastify.get("/ws", { websocket: true }, (socket: WebSocket, req) => {
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
	});
};

export default fp(gameController);
