import Game from "./Game.ts";
import WebSocket from "ws";
import type { difficulty } from "./Player.ts";
import plotRewards from "./chart.ts";
import Tournament from "./Tournament.ts";
import type { Client } from "../plugins/gameController.ts";

export default class GamesManager {
	private tournaments: Record<string, Tournament> = {};
	private rooms: WeakMap<Client, Game> = new WeakMap();
	private waitingClient: Client | null = null;

	createTournament(client: Client, id: string, size: number, passwd: string) {
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
		this.joinTournament(client, id, passwd);
	}
	joinTournament(client: Client, id: string, passwd?: string) {
		const tournament: Tournament | undefined = this.tournaments[id];
		if (!tournament || tournament.started) return;
		if (tournament.password && (!passwd || passwd !== tournament.password))
			return;
		tournament.join(client);
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

		ws.on("close", () => controller.abort());
		const trainingClient: Client = { name: "trainer", socket: ws };
		const game = new Game({
			p1: trainingClient,
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
		const controllerBot = game.board.botController[0];
		if (controllerBot) plotRewards("rewards", controllerBot.rewards, bot);
		console.log("Training loop ended.");
	}
	startTraining(ws: WebSocket, bot: difficulty) {
		this.trainBot(ws, bot, 100);
		console.log("debug");
		return { playerId: "train" };
	}
	startOffline(client: Client, diff: difficulty | null): boolean {
		const game = new Game({
			p1: client,
			botDiff: diff,
			onEnd: () => this.removeRoom(client),
		});
		game.start();
		this.rooms.set(client, game);
		return diff === null;
	}
	startOnline(client: Client) {
		client.socket?.send(JSON.stringify({ event: "searching" }));
		if (this.waitingClient && this.waitingClient !== client) {
			const opponent = this.waitingClient;
			this.waitingClient = null;
			const onEnd = (c: Client) => {
				this.removeRoom(c);
				console.log(`removed: ${c.name}`);
			};
			const game = new Game({
				p1: opponent,
				p2: client,
				onEnd,
			});
			this.rooms.set(opponent, game);
			this.rooms.set(client, game);
			const data = JSON.stringify({ event: "found" });
			opponent.socket?.send(data);
			client.socket?.send(data);
			game.start();
			return;
		}
		if (this.waitingClient === client) return;
		this.waitingClient = client;
	}
	removeFromQueue(client: Client) {
		if (this.waitingClient && client === this.waitingClient) {
			console.log("waiting client removed");
			this.waitingClient = null;
		}
	}
	getRoom(client: Client) {
		return this.rooms.get(client);
	}
	removeRoom(client: Client) {
		this.rooms.delete(client);
	}
	quit(client: Client) {
		if (client.tournament) {
			const tournament = this.tournaments[client.tournament.tournamentId];
			if (!tournament) return;
			tournament.disconnect(client);
		}
		this.removeFromQueue(client);
		this.getRoom(client)?.disconnectPlayer(client);
	}
}
