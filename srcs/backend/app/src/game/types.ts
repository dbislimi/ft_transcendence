import type WebSocket from "ws";
const speed: number = 1;

class Player {
	private ypos: number;

	constructor(fieldHeight: number) {
		this.ypos = fieldHeight / 2;
	}

	private moveUp() {
		this.ypos -= speed;
	}
	private moveDown() {
		this.ypos += speed;
	}
}

class Ball {
	private x: number;
	private y: number;
	private dx: number;
	private dy: number;

	constructor(fieldHeight: number, fieldWidth: number) {
		this.x = fieldWidth / 2;
		this.y = fieldHeight / 2;
		this.dx = Math.random() - 0.5 < 0.5 ? -50 : 50;
		this.dy = Math.random() * 60 - 30;
	}

	bounceX(): void {
		this.dx = -this.dx;
	}
	bounceY(): void {
		this.dy = -this.dy;
	}
	set X(x: number) {
		this.x = x;
	}
	set Y(y: number) {
		this.y = y;
	}
	getXY(): { x: number; y: number } {
		return { x: this.x, y: this.y };
	}
	get dX() {
		return this.dx;
	}
	get dY() {
		return this.dy;
	}
}

class Field {
	private readonly height: number;
	private readonly width: number;
	private players: Player[];
	private ball: Ball;

	constructor(height: number = 100, width: number = 200) {
		this.height = height;
		this.width = width;
		this.ball = new Ball(this.height, this.width);
		this.players = [new Player(this.height)];
	}
	getSize(): { height: number; width: number } {
		return { height: this.height, width: this.width };
	}
	getBallPos(): { x: number; y: number } {
		return this.ball.getXY();
	}
	updateBallPosition(dt: number): void {
		let { x, y } = this.ball.getXY();
		if (y >= this.height || y <= 0) this.ball.bounceY();
		if (x >= this.width || x <= 0) this.ball.bounceX();
		this.ball.X = x + this.ball.dX * dt;
		this.ball.Y = y + this.ball.dY * dt;
	}
}

export default class Game {
	private readonly field: Field;
	private prevTime!: number;
	private readonly ws: WebSocket;
	private static readonly TICK_RATE = 1000 / 60;
	private running = false;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;

	constructor(websocket: WebSocket) {
		this.field = new Field();
		this.ws = websocket;
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

	private gameLoop(): void {
		const now = performance.now();
		const deltaTime = (now - this.prevTime) / 1000;
		this.prevTime = now;

		this.field.updateBallPosition(deltaTime);
		const pos = this.field.getBallPos();
		this.ws.send(JSON.stringify(pos));

		const elapsed = performance.now() - now;
		const delay = Math.max(0, Game.TICK_RATE - elapsed);
		this.timeoutId = setTimeout(() => this.gameLoop(), delay);
	}

	//get WS() {
	//	return this.ws;
	//}
}
