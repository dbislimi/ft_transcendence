import Game from "./Game.ts";
import type { clientSocket } from "./Game.ts";
import WebSocket from "ws";
import type { difficulty } from "./Player.ts";

export default class GamesManager {
	private rooms: Record<number, Game> = {};
	private waitingClient: clientSocket | null = null;
	private waitingRoom: number = 0;
	private nb: number = 0;

	startOffline(clientId: string, ws: WebSocket, diff: difficulty): {playerId: 0, gameId: number}{
		const game = new Game(ws, diff);
		game.start();
		this.rooms[this.nb] = game;
		return {playerId: 0, gameId: this.nb++}
	}
	startOnline(clientId: string, ws: WebSocket): {playerId: 0 | 1, gameId: number} {
		ws.send(JSON.stringify({ event: "searching" }));
		if (this.waitingClient) {
			const data = JSON.stringify({ event: "found" });
			const p1 = this.waitingClient;
			const p2 = {clientId, ws};
			const game: Game = new Game(p1.ws, p2.ws);
			p1.ws.send(data);
			p2.ws.send(data);
			game.start();
			this.rooms[this.waitingRoom] = game;
			this.waitingClient = null;
			return {playerId: 1, gameId: this.waitingRoom!};
		}
		this.waitingRoom = this.nb++;
		this.waitingClient = {clientId, ws};
		return {playerId: 0, gameId: this.waitingRoom};
	}
	removeFromQueue(clientId: string) {
		if (this.waitingClient?.clientId === clientId)
			this.waitingClient = null;
	}
	getRoom(id: number) {
		return id in this.rooms ? this.rooms[id] : undefined;
	}
	removeRoom(id: number) {
		if (id in this.rooms) delete this.rooms[id];
	}
}
