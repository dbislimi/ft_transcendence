import Board from "./Board.js";
import type { difficulty } from "./Player.js";
import type { Client } from "../plugins/websockets.js";
import { withLag } from "../utils/NetworkSimulator.js";

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

	elaspedTime: number = 0;
	private winner: number | undefined = undefined;

	private inputQueues: [
		Array<{ inputId: number; type: string; dir: string }>,
		Array<{ inputId: number; type: string; dir: string }>
	] = [[], []];
	private lastProcessedInputIds: [number, number] = [-1, -1];

	constructor({
		p1,
		p2,
		onEnd,
		botDiff,
		train = false,
		options = {},
	}: {
		p1: Client;
		p2?: Client;
		onEnd: ((client: Client, winner: boolean, scores: number[]) => void) | null;
		botDiff?: difficulty | null;
		train?: boolean;
		options?: {
			bonus?: boolean;
		};
	}) {
		this.onEnd = onEnd;
		this.board = new Board((id: number) => {
			this.winner = id;
		}, options?.bonus ?? false);
		this.clientsId.set(p1, 0);
		p1.inGameId = 0;
		if (p2 !== undefined) {
			p2.inGameId = 1;
			this.clients = [p1, p2];
			this.clientsId.set(p2, 1);
			return;
		}
		this.clients = [p1, undefined];
		if (botDiff === undefined)
			throw Error("Bot difficulty must be specified if p2 isn't set.");
		if (botDiff === null) return;
		if (train === false) this.board.connectBot(1, botDiff);
		else {
			this.board.Training = true;
			GAMESPEED = 2.5;
			this.board.connectBot(0, botDiff, true);
			this.board.connectBot(1, "impossible");
		}
	}

	connectPlayer(p: Client) {
		this.board.disconnectBot();
		this.board.reset();
		this.clients[1] = p;
		p.inGameId = 1;
		this.clientsId.set(p, 1);
	}

	disconnectPlayer(p: Client) {
		const id: 0 | 1 | undefined = p.inGameId;
		if (id === undefined) return;
		this.stop(((id + 1) % 2) as 0 | 1);
	}
	send(
		data: string | Buffer | ArrayBuffer | Buffer[],
		cb?: (err?: Error) => void
	) {
		for (const client of this.clients) {
			if (client?.socket) {
				withLag(() => client.socket?.send(data, cb));
			}
		}
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
		if (this.timeoutId) return;
		this.prevTime = performance.now();
		this.gameLoop();
	}
	public pause(): void {
		if (!this.timeoutId) return;
		clearTimeout(this.timeoutId);
		this.timeoutId = null;
	}
	private stop(winner: number): void {
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
		this.winner = undefined;
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
	private applyMove(type: string, dir: string, player: 0 | 1) {
		if (dir === "up") this.up(type, player);
		else this.down(type, player);
	}

	move(type: string, dir: string, player: 0 | 1 | undefined, inputId?: number) {
		if (player === undefined) {
			return;
		}
		if (inputId === undefined) {
			this.applyMove(type, dir, player);
			return;
		}
		if (inputId <= this.lastProcessedInputIds[player]) {
			return;
		}
		this.inputQueues[player].push({ inputId, type, dir });
		this.inputQueues[player].sort((a, b) => a.inputId - b.inputId);
		while (
			this.inputQueues[player].length > 0 &&
			this.inputQueues[player][0].inputId ===
				this.lastProcessedInputIds[player] + 1
		) {
			const input = this.inputQueues[player].shift()!;
			this.applyMove(input.type, input.dir, player);
			this.lastProcessedInputIds[player] = input.inputId;
			this.board.players[player].lastProcessedInputId = input.inputId;
		}
	}

	setBall(x: number, y: number) {
		this.board.setBallPos(x, y);
	}

	getData() {
		return {
			event: "data",
			to: "pong",
			body: {
				ball: {
					x: this.board.getBallData().x,
					y: this.board.getBallData().y,
				},
				players: this.board.getPlayersData(),
				bonuses: this.board.getBonusData(),
				timestamp: Date.now(),
			},
		};
	}
	shouldSend: boolean = true;
	private gameLoop(): void {
		const now = performance.now();
		let deltaTime = ((now - this.prevTime) / 1000) * GAMESPEED;
		const MAX_DELTA = 0.08;
		deltaTime = Math.min(deltaTime, MAX_DELTA);
		this.prevTime = now;

		if (this.winner !== undefined) {
			this.stop(this.winner);
			return;
		}
		this.board.update(deltaTime);
		this.elaspedTime += deltaTime;
		if (this.shouldSend) {
			const data = this.getData();
			this.send(JSON.stringify(data));
		}
		this.shouldSend = !this.shouldSend;
		const elapsed = performance.now() - now;
		const delay = Math.max(0, Game.TICK_RATE - elapsed);
		this.timeoutId = setTimeout(() => this.gameLoop(), delay);
	}
	getOpp(client: Client) {
		const opp = this.clients.find((c) => c !== client);
		return opp;
	}
}
