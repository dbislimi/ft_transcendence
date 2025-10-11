import Game from "./Game.ts";
import type { clientSocket } from "./Game.ts";
import WebSocket from "ws";
import type { difficulty } from "./Player.ts";
import plotRewards from "./chart.ts";
import Tournament from "./Tournament.ts";

export default class GamesManager {
	private tournaments: Record<string, Tournament> = {};
	private rooms: WeakMap<WebSocket, Game> = new WeakMap();
	private waitingClient: { ws: WebSocket; game: Game } | null = null;
	private onAbort: (() => void) | undefined;

	createTournament(ws: WebSocket, id: string, size: number, passwd: string) {
		if (this.tournaments[id])
			throw new Error(`Tournament with id ${id} already exists.`);
		this.tournaments[id] = new Tournament({
			rooms: this.rooms,
			id,
			password: passwd,
			capacity: size,
			onEnd: () => {
				delete this.tournaments[id];
				console.log("onEnd tour called");
			},
		});
		this.joinTournament(ws, id, passwd);
	}
	joinTournament(ws: WebSocket, id: string, passwd?: string) {
		const tournament: Tournament = this.tournaments[id];
		if (!tournament || tournament.started) return;
		if (tournament.password && (!passwd || passwd !== tournament.password))
			return;
		tournament.join(ws);
	}
	listTournaments() {
		return Object.values(this.tournaments)
			.map((t) => ({
				id: t.id,
				players: t.players.length,
				capacity: t.capacity,
				private: !!t.password,
				started: t.started,
			}))
			.filter((t) => !t.started);
	}
	async trainBot(ws: WebSocket, bot: difficulty, games: number) {
		const controller = new AbortController();
		const { signal } = controller;
		this.onAbort = () => controller.abort();
		ws.on("close", this.onAbort);
		const game = new Game({
			p1: ws,
			botDiff: bot,
			train: true,
			onEnd: null,
		});
		for (let i = 0; i < games; ++i) {
			if (signal.aborted) break;
			console.log(`game ${i + 1}`);
			try {
				await game.startAsync(signal);
			} catch (e) {
				console.log("test");
				if (signal.aborted)
					console.log("Training aborted during game ", i);
				break;
			}
		}
		if (game.board.botController.length !== 0)
			plotRewards("rewards", game.board.botController[0].rewards, game.board.botController[0].type);
		console.log("Training loop ended.");
		const totalSeconds = Math.floor(game.elaspedTime);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		console.log(`Training time: ${hours}h${minutes}min${seconds}sec`);
	}
	startTraining(ws: WebSocket, bot: difficulty) {
		this.trainBot(ws, bot, 100);
		console.log("debug");
		return { playerId: "train" };
	}
	startOffline(ws: WebSocket, diff: difficulty | null): boolean {
		const game = new Game({
			p1: ws,
			botDiff: diff,
			onEnd: () => this.removeRoom(ws),
		});
		console.log("startOffline", diff === null);

		game.start();
		this.rooms.set(ws, game);
		return diff === null;
	}
	startOnline(clientId: string, ws: WebSocket) {
		ws.send(JSON.stringify({ event: "searching" }));
		if (this.waitingClient) {
			const data = JSON.stringify({ event: "found" });
			this.waitingClient.ws.send(data);
			ws.send(data);
			this.waitingClient.game.connectPlayer(ws);
			this.rooms.set(ws, this.waitingClient.game);
			this.waitingClient = null;
			return;
		}
		const game = new Game({
			p1: ws,
			botDiff: "medium",
			onEnd: (ws: WebSocket) => {
				this.removeRoom(ws);
				console.log(`removed: ${ws}`);
			},
		});
		game.start();
		this.waitingClient = { ws, game };
		this.rooms.set(ws, game);
		return;
	}
	removeFromQueue(ws: WebSocket) {
		if (this.waitingClient && ws === this.waitingClient.ws) {
			console.log("waiting client removed");
			this.waitingClient.game.disconnectPlayer(ws);
			this.waitingClient = null;
		}
	}
	getRoom(ws: WebSocket) {
		return this.rooms.get(ws);
	}
	removeRoom(ws: WebSocket) {
		this.rooms.delete(ws);
	}
	quit(ws: WebSocket, tournamentId?: string) {
		this.onAbort?.();
		if (tournamentId) {
			const tournament = this.tournaments[tournamentId];
			if (!tournament) return ;
			tournament.disconnect(ws);
		}
		this.removeFromQueue(ws);
		this.getRoom(ws)?.disconnectPlayer(ws);
	}
}
