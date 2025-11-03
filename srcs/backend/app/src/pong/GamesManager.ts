import Game from "./Game.ts";
import { DEFAULT_COUNTDOWN_SECONDS } from "./config.ts";
import WebSocket from "ws";
import type { difficulty } from "./Player.ts";
import plotRewards from "./chart.ts";
import Tournament from "./Tournament.ts";
import type { Client } from "../plugins/gameController.ts";

export default class GamesManager {
	private tournaments: Record<string, Tournament> = {};
	private rooms: WeakMap<Client, Game> = new WeakMap();
	private waitingClient: Client | null = null;
	private countdowns: WeakMap<Game, { cancelled: boolean }> = new WeakMap();
	private static readonly COUNTDOWN_SECONDS = DEFAULT_COUNTDOWN_SECONDS;

	createTournament(client: Client, id: string, size: number, passwd: string): boolean {
		if (this.tournaments[id]) {
			client.socket?.send(JSON.stringify({ event: "error", msg: "tournamentId" }));
			return false;
		}
		this.tournaments[id] = new Tournament({
			rooms: this.rooms,
			id,
			password: passwd,
			capacity: size,
			onEnd: () => {
				delete this.tournaments[id];
				console.log("onEnd tour called");
			},
			startCountdown: (game, clients) => this.startWithCountdown(game, clients),
			setRoom: (client, game) => this.setRoom(client, game),
			cancelCountdown: (game) => {
				const entry = this.countdowns.get(game);
				if (entry) {
					entry.cancelled = true;
					this.countdowns.delete(game);
				}
			},
		});
		this.joinTournament(client, id, passwd);
		return true;
	}
	joinTournament(client: Client, id: string, passwd?: string) {
		const tournament: Tournament | undefined = this.tournaments[id];
		if (!tournament || tournament.started) return;
		if (tournament.password && (!passwd || passwd !== tournament.password)) return;
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
	const trainingClient: Client = { id: -1, name: "trainer", socket: ws } as Client;
		const game = new Game({ p1: trainingClient, botDiff: bot, train: true, onEnd: null });
		for (let i = 0; i < games; ++i) {
			if (signal.aborted) break;
			console.log(`game ${i + 1}`);
			try {
				await game.startAsync(signal);
			} catch (e) {
				console.log("test");
				if (signal.aborted) console.log("Training aborted during game ", i);
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
			onEnd: (c: Client, didWin: boolean, scores: number[]) => {
				this.removeRoom(c);
				if (!c.quit) {
					c.socket?.send(JSON.stringify({ event: "result", body: { is: "offline", didWin, scores } }));
				}
			},
		});
		this.setRoom(client, game);
		this.startWithCountdown(game, [client]);
		return diff === null;
	}
	startOnline(client: Client) {
		if (this.waitingClient && this.waitingClient !== client) {
			const opponent = this.waitingClient;
			this.waitingClient = null;
			console.log(`[Matchmaking] Pairing ${opponent.name} vs ${client.name}`);
			const onEnd = (c: Client, didWin: boolean, scores: number[]) => {
				this.removeRoom(c);
				if (!c.quit) {
					c.socket?.send(JSON.stringify({ event: "result", body: { is: "quick", didWin, scores } }));
				}
			};
			const game = new Game({ p1: opponent, p2: client, onEnd });
			this.setRoom(opponent, game);
			this.setRoom(client, game);
			this.startWithCountdown(game, [opponent, client]);
			return;
		}
		console.log(`[Matchmaking] ${client.name} queued for quick match`);
		client.socket?.send(JSON.stringify({ event: "searching" }));
		console.log(`[Matchmaking] 'searching' sent to ${client.name}`);
		this.waitingClient = client;
	}
	removeFromQueue(client: Client) {
		if (this.waitingClient && client === this.waitingClient) {
			console.log("waiting client removed");
			this.waitingClient = null;
		}
	}
	private broadcastPlayersInfo(game: Game, clients: (Client | undefined)[]) {
		for (const client of clients) {
			if (!client?.socket) continue;
			const opponent = game.getOpp(client)?.name ?? null;
			client.socket.send(JSON.stringify({ event: "players", body: { opponent, side: client.inGameId ?? null } }));
		}
	}
	private async startWithCountdown(game: Game, clients: (Client | undefined)[], seconds: number = GamesManager.COUNTDOWN_SECONDS) {
		const entry = { cancelled: false };
		this.countdowns.set(game, entry);
		this.broadcastPlayersInfo(game, clients);
		console.log(`[Countdown] init for game with ${seconds}s`);

		// Failsafe: start the game even if something stalls, unless cancelled.
		let started = false;
		const failsafeId = setTimeout(() => {
			if (!entry.cancelled && !started) {
				console.log(`[Countdown] failsafe start triggered`);
				this.countdowns.delete(game);
				game.start();
			}
		}, (seconds + 2) * 1000);

		for (let remaining = seconds; remaining > 0; remaining--) {
			if (entry.cancelled) {
				console.log(`[Countdown] cancelled during countdown at ${remaining}`);
				clearTimeout(failsafeId);
				this.countdowns.delete(game);
				return;
			}
			console.log(`[Countdown] remaining=${remaining}`);
			try {
				this.broadcastCountdown(clients, remaining);
			} catch (err) {
				console.error(`[Countdown] broadcast error at ${remaining}:`, err);
			}
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
		if (entry.cancelled) {
			console.log(`[Countdown] cancelled after loop`);
			clearTimeout(failsafeId);
			this.countdowns.delete(game);
			return;
		}
		try {
			this.broadcastCountdown(clients, 0);
		} catch (err) {
			console.error(`[Countdown] broadcast error at 0:`, err);
		}
		this.countdowns.delete(game);
		started = true;
		clearTimeout(failsafeId);
		console.log(`[Countdown] starting game now`);
		game.start();
	}
	private broadcastCountdown(clients: (Client | undefined)[], remaining: number) {
		const payload = JSON.stringify({ event: "countdown", body: { remaining } });
		for (const client of clients) client?.socket?.send(payload);
	}
	setRoom(client: Client, game: Game) {
		const room = this.rooms.get(client);
		if (room) {
			if (room.clients[0] && room.clients[1]) room.disconnectPlayer(client);
			else {
				room.pause();
				this.removeRoom(client);
			}
		}
		client.quit = false;
		this.rooms.set(client, game);
	}
	getRoom(client: Client) {
		return this.rooms.get(client);
	}
	removeRoom(client: Client) {
		console.log(`removed: ${client.name}`);
		const game = this.rooms.get(client);
		if (!game) return;
		this.rooms.delete(client);
		const countdown = this.countdowns.get(game);
		if (countdown) {
			countdown.cancelled = true;
			this.countdowns.delete(game);
		}
	}
	stop_offline(client: Client) {
		client.quit = true;
		this.getRoom(client)?.disconnectPlayer(client);
	}
	stop_online(client: Client) {
		client.quit = true;
		if (client.tournament) {
			const tournament = this.tournaments[client.tournament.tournamentId];
			if (!tournament) return;
			tournament.disconnect(client);
		} else {
			this.removeFromQueue(client);
			this.getRoom(client)?.disconnectPlayer(client);
		}
	}

	playerReady(client: Client) {
		if (!client.tournament) return;
		const t = this.tournaments[client.tournament.tournamentId];
		if (!t) return;
		if (this.getRoom(client)) return;
		t.playerReady(client);
	}

	handleRejoin(client: Client) {
		if (!client.tournament) return;
		const t = this.tournaments[client.tournament.tournamentId];
		if (!t) return;
		client.quit = false;
		t.reconnect(client);
	}
}
