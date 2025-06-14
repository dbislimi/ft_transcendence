import type WebSocket from "ws";
const speed: number = 1;

interface PlayerData {
	size: number;
	y: number;
}

class Player {
	private width: number;
	private size: number;
	private x: number;
	private y: number;
	private static id: number = 0;

	constructor(field: Field) {
		this.y = field.H / 2;
		this.size = field.H / 4;
		this.width = field.W / 50;
		if (Player.id++) this.x = 2 * this.width;
		else this.x = field.W - 2 * this.width;
	}

	private moveUp() {
		this.y -= speed;
	}
	private moveDown() {
		this.y += speed;
	}

	getData(): { size: number, y: number }{
		return { size: this.size, y: this.y };
	}
}

class Ball {
	private radius: number;
	private x: number;
	private y: number;
	private dx: number;
	private dy: number;

	constructor(field: Field, size: number = 6) {
		this.x = field.W / 2;
		this.y = field.H / 2;
		this.dx = Math.random() - 0.5 < 0.5 ? -50 : 50;
		this.dy = Math.random() * 60 - 30;
		this.radius = size / 2;
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
	get Radius() {
		return this.radius;
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
		this.ball = new Ball(this);
		this.players = [new Player(this), new Player(this)];
	}

	//getBallPos(): { x: number; y: number } {
	//	return this.ball.getXY();
	//}
	//getPlayersPos(): { y1: number; y2: number } {
	//	return { y1: this.players[0].Y, y2: this.players[1].Y };
	//}
	getBallData(): { radius: number; x: number; y: number } {
		return { radius: this.ballRadius, ...this.ball.getXY() };
	}
	getPlayersData(): { p1: PlayerData, p2: PlayerData }{
		return {p1: this.players[0].getData(), p2: this.players[1].getData()};
	}
	updateBallPosition(dt: number): void {
		let { x, y } = this.ball.getXY();
		if (y >= this.height || y <= 0) this.ball.bounceY();
		if (x >= this.width || x <= 0) this.ball.bounceX();
		this.ball.X = x + this.ball.dX * dt;
		this.ball.Y = y + this.ball.dY * dt;
	}

	get H(): number {
		return this.height;
	}
	get W(): number {
		return this.width;
	}
	get ballRadius() {
		return this.ball.Radius;
	}
}

export default class Game {
	private readonly field: Field;
	private prevTime!: number;
	private readonly ws: WebSocket;
	private static readonly TICK_RATE = 1000 / 60;
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
