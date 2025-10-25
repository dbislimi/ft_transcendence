import type WebSocket from "ws";
import Board from "./Board.ts";
import type { difficulty } from "./Player.ts";
import type { Client } from "../plugins/gameController.ts";

let GAMESPEED: number = 1;

export default class Game {
	readonly board: Board;
	clients: [Client, Client | undefined];
	private clientsId: WeakMap<Client, 0 | 1> = new WeakMap();
	private timeoutId: ReturnType<typeof setTimeout> | null = null;
	private prevTime!: number;
	private static readonly TICK_RATE = 1000 / 60;
	private onEnd:
		| ((client: Client, winner: boolean, scores: number[]) => void)
		| null;
	private onResolve: (() => void) | undefined;
	private onAbort!: () => void;
	private signal: AbortSignal | undefined = undefined;
	private winner: 0 | 1 | undefined = undefined;

	constructor({
		p1,
		p2,
		onEnd,
		botDiff,
		train = false,
	}: {
		p1: Client;
		p2?: Client;
		onEnd:
			| ((client: Client, winner: boolean, scores: number[]) => void)
			| null;
		botDiff?: difficulty | null;
		train?: boolean;
	}) {
		this.onEnd = onEnd;
		this.board = new Board((id: 0 | 1) => (this.winner = id));
		this.clientsId.set(p1, 0);
		p1.inGameId = 0;
		if (p2 !== undefined) {
			p2.inGameId = 1;
			this.clients = [p1, p2];
			this.clientsId.set(p2, 1);
			this.send(JSON.stringify({ event: "found" }));
			return;
		}
		this.clients = [p1, undefined];
		if (botDiff === undefined)
			throw Error("Bot difficulty must be specified if p2 isn't set.");
		if (botDiff === null) return;
		if (train === false) this.board.connectBot(1, botDiff);
		else {
			console.log("connectbot ", botDiff);
			this.board.Training = true;
			GAMESPEED = 100;
			this.board.connectBot(0, botDiff, true);
			this.board.connectBot(1, "hard");
		}
	}

	connectPlayer(p: Client) {
		this.board.disconnectBot();
		this.board.restart();
		this.clients[1] = p;
		p.inGameId = 1;
		this.clientsId.set(p, 1);
		this.send(JSON.stringify({ event: "found" }));
	}

	disconnectPlayer(p: Client) {
		console.log("try to disconnect");
		const id: 0 | 1 | undefined = p.inGameId;
		if (id === undefined) return;
		console.log("disconnected");
		this.stop(((id + 1) % 2) as 0 | 1);
	}
	private send(
		data: string | Buffer | ArrayBuffer | Buffer[],
		cb?: (err?: Error) => void
	) {
		for (const client of this.clients) client?.socket?.send(data, cb);
	}
	public startAsync(signal: AbortSignal) {
		this.signal = signal;
		return new Promise<void>((resolve, reject) => {
			this.onAbort = () => {
				this.pause();
				signal.removeEventListener("abort", this.onAbort);
				reject(new Error("Training aborted."));
			};
			signal.addEventListener("abort", this.onAbort);
			this.onResolve = resolve;
			this.restart();
		});
	}
	public start(): void {
		console.log("game started");
		if (this.timeoutId) return;
		this.prevTime = performance.now();
		this.gameLoop();
	}
	public pause(): void {
		if (!this.timeoutId) return;
		console.log("game paused");
		clearTimeout(this.timeoutId);
		this.timeoutId = null;
	}
	private stop(winner: 0 | 1): void {
		this.pause();
		this.signal?.removeEventListener("abort", this.onAbort);
		if (this.onResolve) {
			this.onResolve();
			return;
		}
		if (!this.onEnd) return;
		this.onEnd(
			this.clients[0],
			this.clients[0].inGameId === winner,
			this.board.scores
		);
		if (this.clients[1])
			this.onEnd(
				this.clients[1],
				this.clients[1].inGameId === winner,
				this.board.scores
			);
	}
	private restart() {
		console.log("game restarted");
		this.board.restart();
		this.start();
	}
	private up(type: string, player: 0 | 1) {
		if (!this.board.players[player].up && type === "press")
			this.board.players[player].moveUp(true);
		else if (this.board.players[player].up && type === "release")
			this.board.players[player].moveUp(false);
	}
	private down(type: string, player: 0 | 1) {
		if (!this.board.players[player].down && type === "press")
			this.board.players[player].moveDown(true);
		else if (this.board.players[player].down && type === "release")
			this.board.players[player].moveDown(false);
	}
	move(type: string, dir: string, player: 0 | 1 | undefined) {
		// console.log(player);
		//if (typeof player === "object") {
		//	if (this.clientsId.get(player) === undefined)
		//		throw new Error("ClientsId undefined");
		//	if (dir === "up") this.up(type, this.clientsId.get(player)!);
		//	else this.down(type, this.clientsId.get(player)!);
		//	return;
		//}
		if (player === undefined) {
			console.log("PLAYER GAMEID UNDEFINED");
			return;
		}
		if (dir === "up") this.up(type, player);
		else this.down(type, player);
	}
	setBall(x: number, y: number) {
		this.board.setBallPos(x, y);
	}

	private gameLoop(): void {
		const now = performance.now();
		let deltaTime = ((now - this.prevTime) / 1000) * GAMESPEED;
		const MAX_DELTA = 0.1;
		deltaTime = Math.min(deltaTime, MAX_DELTA);
		this.prevTime = now;

		if (this.winner !== undefined) {
			this.stop(this.winner);
			return;
		}
		this.board.update(deltaTime);
		const data = {
			event: "data",
			body: {
				ball: {
					...this.board.getBallData(),
					speed: (this.board.getBallSpeed() * 3.6).toFixed(2),
				},
				players: this.board.getPlayersData(),
				bonuses: {
					count: this.board.bonus.length,
					bonuses: this.board.getBonusData(),
				},
			},
		};
		this.send(JSON.stringify(data));

		const elapsed = performance.now() - now;
		const delay = Math.max(0, Game.TICK_RATE - elapsed);
		this.timeoutId = setTimeout(() => this.gameLoop(), delay);
	}
	getOpp(client: Client) {
		const opp = this.clients.find((c) => c !== client);
		return opp;
	}
}
