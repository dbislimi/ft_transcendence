import type WebSocket from "ws";
import Board from "./Board.ts";

export default class Game {
	private readonly board: Board;
	private prevTime!: number;
	private readonly ws: WebSocket;
	private static readonly TICK_RATE = 1000 / 60;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;

	constructor(websocket: WebSocket) {
		this.board = new Board();
		this.ws = websocket;
		this.board.connect();
	}

	public start(): void {
		this.prevTime = performance.now();
		this.gameLoop();
	}
	public stop(): void {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}
	up(type: string) {
		if (!this.board.players[0].up && type === "press")
			this.board.players[0].moveUp(true);
		else if (this.board.players[0].up && type === "release")
			this.board.players[0].moveUp(false);
	}
	down(type: string) {
		if (!this.board.players[0].down && type === "press")
			this.board.players[0].moveDown(true);
		else if (this.board.players[0].down && type === "release")
			this.board.players[0].moveDown(false);
	}
	setBall(x: number, y: number) {
		this.board.setBallPos(x, y);
	}


	private gameLoop(): void {
		const now = performance.now();
		const deltaTime = (now - this.prevTime) / 1000;
		this.prevTime = now;

		this.board.update(deltaTime);
		const data = {
			ball: { ...this.board.getBallData(), speed: (this.board.getBallSpeed() * 3.6).toFixed(2) },
			players: this.board.getPlayersData(),
		};
		this.ws.send(JSON.stringify(data));

		const elapsed = performance.now() - now;
		const delay = Math.max(0, Game.TICK_RATE - elapsed);
		this.timeoutId = setTimeout(() => this.gameLoop(), delay);
	}
}
