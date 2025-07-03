import Game from "./Game.ts";
import type { clientSocket } from "./Game.ts";
import WebSocket from "ws";

export default class GamesManager {
	private rooms: Record<string, Game> = {};
	private queue: clientSocket[] = [];

	startOnline(clientId: string, ws: WebSocket): 0 | 1 {
		ws.send(JSON.stringify({ event: "searching" }));
		this.queue.push({ clientId, ws });
		if (this.queue.length > 1) {
			const data = JSON.stringify({ event: "found" });
			const p1 = this.queue.shift()!;
			const p2 = this.queue.shift()!;
			const game: Game = new Game(p1, p2);
			p1.ws.send(data);
			p2.ws.send(data);
			game.start();
			this.rooms[p1.clientId] = game;
			this.rooms[p2.clientId] = game;
			return 1;
		}
		return 0;
	}
	removeFromQueue(clientId: string) {
		this.queue = this.queue.filter(
			(client) => client.clientId !== clientId
		);
	}
	getRoom(id: string) {
		return id in this.rooms ? this.rooms[id] : undefined;
	}
	removeRoom(id: string) {
		if (id in this.rooms) delete this.rooms[id];
	}
}
