import type WebSocket from "ws";
import Board from "./Board.ts";
import type { difficulty } from "./Player.ts";

export type trainDifficulty = `train${difficulty}`;
export type clientSocket = {
	clientId: string;
	ws: WebSocket;
};
const GAMESPEED: number = 100;

export default class Game {
	readonly board: Board;
	private readonly clients: [WebSocket, WebSocket | undefined];
	private timeoutId: ReturnType<typeof setTimeout> | null = null;
	private prevTime!: number;
	private maxScore: number = 5;
	private static readonly TICK_RATE = 1000 / 60;
	private onEnd: (() => void) | undefined;
	private onAbort!: () => void;
	private signal: AbortSignal | undefined = undefined;

	constructor(p1: WebSocket, p2: WebSocket | difficulty | trainDifficulty | undefined, onEnd?: () => void) {
		this.onEnd = onEnd;
		this.board = new Board();
		if (typeof p2 === "object"){
			this.clients = [p1, p2];
			return ;
		}
		this.clients = [p1, undefined];
		if (p2 === undefined)
			return;
		if (p2[0] !== 't')
			this.board.connectBot(1 ,p2 as difficulty);
		else{
			console.log("connectbot");
			this.board.Training = true;
			this.board.connectBot(1, "hard");
			this.board.connectBot(0, p2.slice(5) as difficulty);
		}
	}

	private send(
		data: string | Buffer | ArrayBuffer | Buffer[],
		cb?: (err?: Error) => void
	) {
		for (const ws of this.clients) ws?.send(data, cb);
	}
	public startAsync(signal: AbortSignal){
		this.signal = signal;
		return new Promise<void>((resolve, reject) => {
			this.onAbort = () => {
				this.pause();
				signal.removeEventListener("abort", this.onAbort);
				reject(new Error("Training aborted."));
			}
			signal.addEventListener("abort", this.onAbort);
			this.onEnd = resolve;
			this.restart();
		})
	}
	public start(): void {
		this.prevTime = performance.now();
		this.gameLoop();
	}
	public pause(): void {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}
	private stop(winner: number): void {
		this.pause();
		this.signal?.removeEventListener("abort", this.onAbort);
		const data = { event: "win", body: winner };
		this.send(JSON.stringify(data));
		this.onEnd?.();
	}
	private restart(){
		this.board.restart();
		this.start();
	}
	private up(type: string, player: 0 | 1) {
		if (!this.board.players[player].up && type === "press") {
			this.board.players[player].moveUp(true);
		} else if (this.board.players[player].up && type === "release")
			this.board.players[player].moveUp(false);
	}
	private down(type: string, player: 0 | 1) {
		if (!this.board.players[player].down && type === "press")
			this.board.players[player].moveDown(true);
		else if (this.board.players[player].down && type === "release")
			this.board.players[player].moveDown(false);
	}
	move(type: string, dir: string, player: 0 | 1) {
		if (dir === "up") this.up(type, player);
		else this.down(type, player);
	}
	setBall(x: number, y: number) {
		this.board.setBallPos(x, y);
	}

	private gameLoop(): void {
		const now = performance.now();
		const deltaTime = (now - this.prevTime) / 1000 * GAMESPEED;
		this.prevTime = now;

		const winner = this.board.scores.findIndex((n) => n === this.maxScore);
		if (winner !== -1) {
			this.stop(winner);
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
				bonus: {count: this.board.bonus.length ,bonuses: this.board.getBonusData()}
			},
		};
		this.send(JSON.stringify(data));

		const elapsed = performance.now() - now;
		const delay = Math.max(0, Game.TICK_RATE - elapsed);
		this.timeoutId = setTimeout(() => this.gameLoop(), delay);
	}
}
