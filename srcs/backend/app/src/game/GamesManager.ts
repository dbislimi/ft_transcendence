import Game from "./Game.ts";
import type { clientSocket } from "./Game.ts";
import WebSocket from "ws";
import type { difficulty } from "./Player.ts";
import type { trainDifficulty } from "./Game.ts"
import plotRewards from "./chart.ts";

export default class GamesManager {
	private rooms: Record<number, Game> = {};
	private waitingClient: clientSocket | null = null;
	private waitingRoom: number = 0;
	private nb: number = 0;

	async trainBot(ws: WebSocket, bot: difficulty, games: number){
		const controller = new AbortController();
		const { signal } = controller;

		ws.on('close', () => controller.abort());
		const game = new Game(ws, "train" + bot as trainDifficulty);
		for (let i = 0; i < games; ++i){
			if (signal.aborted) break;
			console.log(`game ${i + 1}`);
			try {
				await game.startAsync(signal);
			} catch (e) {
				console.log('test');
				if (signal.aborted)
					console.log("Training aborted during game ", i);
				break ;
			}
		}
		if (game.board.botController.length !== 0)
			plotRewards(game.board.botController[0].rewards);
		console.log("Training loop ended.");
	}
	startTraining(ws: WebSocket, bot: difficulty){
		this.trainBot(ws, bot, 100);
		console.log("debug");
		return {playerId: "train"};
	}
	startOffline(
		ws: WebSocket,
		diff?: difficulty
	): { playerId: 0 | undefined; gameId: number } {
		const game = new Game(ws, diff as difficulty, () => this.removeRoom(this.nb));
		console.log(diff);

		game.start();
		this.rooms[this.nb] = game;
		return { playerId: diff ? 0 : undefined, gameId: this.nb++ };
	}
	startOnline(
		clientId: string,
		ws: WebSocket
	): { playerId: 0 | 1; gameId: number } {
		ws.send(JSON.stringify({ event: "searching" }));
		if (this.waitingClient) {
			const data = JSON.stringify({ event: "found" });
			const p1 = this.waitingClient;
			const p2 = { clientId, ws };
			const game: Game = new Game(p1.ws, p2.ws, () => this.removeRoom(this.nb));
			p1.ws.send(data);
			p2.ws.send(data);
			game.start();
			this.rooms[this.waitingRoom] = game;
			this.waitingClient = null;
			return { playerId: 1, gameId: this.waitingRoom! };
		}
		this.waitingRoom = this.nb++;
		this.waitingClient = { clientId, ws };
		return { playerId: 0, gameId: this.waitingRoom };
	}
	removeFromQueue(clientId: string) {
		if (this.waitingClient?.clientId === clientId) this.waitingClient = null;
	}
	getRoom(id: number) {
		return id in this.rooms ? this.rooms[id] : undefined;
	}
	removeRoom(id: number) {
		if (id in this.rooms) delete this.rooms[id];
	}
}
