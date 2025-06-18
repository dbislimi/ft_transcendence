import type WebSocket from "ws";
import Field from "./Field.ts";

export default class Game {
	private readonly field: Field;
	private prevTime!: number;
	private readonly ws: WebSocket;
	private static readonly TICK_RATE = 1000 / 60;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;

	constructor(websocket: WebSocket) {
		this.field = new Field();
		this.ws = websocket;
		this.field.connect();
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
		if (!this.field.players[0].up && type === "press")
			this.field.players[0].moveUp(true);
		else if (this.field.players[0].up && type === "release")
			this.field.players[0].moveUp(false);
	}
	down(type: string) {
		if (!this.field.players[0].down && type === "press")
			this.field.players[0].moveDown(true);
		else if (this.field.players[0].down && type === "release")
			this.field.players[0].moveDown(false);
	}
	setBall(x: number, y: number) {
		this.field.setBallPos(x, y);
	}

	private gameLoop(): void {
		const now = performance.now();
		const deltaTime = (now - this.prevTime) / 1000;
		this.prevTime = now;

		this.field.update(deltaTime);
		const data = {
			ball: this.field.getBallData(),
			players: this.field.getPlayersData(),
		};
		this.ws.send(JSON.stringify(data));

		const elapsed = performance.now() - now;
		const delay = Math.max(0, Game.TICK_RATE - elapsed);
		this.timeoutId = setTimeout(() => this.gameLoop(), delay);
	}
}
