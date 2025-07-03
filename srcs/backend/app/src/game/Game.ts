import type WebSocket from "ws";
import Board from "./Board.ts";

export type clientSocket = {
	clientId: string;
	ws: WebSocket;
};

export default class Game {
	private readonly board: Board;
	private readonly clients: [clientSocket, clientSocket | null];
	private static readonly TICK_RATE = 1000 / 60;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;
	private prevTime!: number;
	private maxScore: number = 5;

	constructor(p1: clientSocket, p2?: clientSocket) {
		this.board = new Board();
		this.clients = [p1, p2 ?? null];
		this.board.connect(p2 ? 2 : 1);
	}

	private send(
		data: string | Buffer | ArrayBuffer | Buffer[],
		cb?: (err?: Error) => void
	) {
		for (const client of this.clients) client?.ws.send(data, cb);
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
		const data = { event: "win", body: winner };
		this.send(JSON.stringify(data));
	}

	
	private up(type: string, player: 0 | 1) {
		console.log("up args:", type, player);
		if (!this.board.players[player].up && type === "press"){
			this.board.players[player].moveUp(true);
		}
		else if (this.board.players[player].up && type === "release")
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
		const deltaTime = (now - this.prevTime) / 1000;
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
			},
		};
		this.send(JSON.stringify(data));

		const elapsed = performance.now() - now;
		const delay = Math.max(0, Game.TICK_RATE - elapsed);
		this.timeoutId = setTimeout(() => this.gameLoop(), delay);
	}
}
