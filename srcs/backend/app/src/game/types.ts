import type WebSocket from "ws";
const speed: number = 1;

interface PlayerData {
	size: number;
	y: number;
}

class Player {
	private static width: number;
	private size: number;
	private x: number;
	private y: number;
	private static id: number = 0;

	constructor(field: Field) {
		this.size = field.H / 4;
		this.y = field.H / 2 - this.size / 2;
		Player.width = field.W / 50;
		if (Player.id++ == 0) this.x = Player.width;
		else this.x = field.W - 2 * Player.width;
		console.log(this.x);
	}

	private moveUp() {
		this.y -= speed;
	}
	private moveDown() {
		this.y += speed;
	}

	getData(): { size: number; y: number } {
		return { size: this.size, y: this.y };
	}

	get X() {
		return this.x;
	}
	get Y() {
		return this.y;
	}
	get Width() {
		return Player.width;
	}
	get Size() {
		return this.size;
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
		console.log("bounce");
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
	private score: number[] = [0, 0];

	constructor(height: number = 100, width: number = 200) {
		this.height = height;
		this.width = width;
		this.ball = new Ball(this);
		this.players = [new Player(this), new Player(this)];
	}

	addScore(player: number) {
		this.score[player]++;
		this.ball.X = this.width / 2;
		this.ball.Y = this.height / 2;
		this.ball.bounceX();
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
	getPlayersData(): { p1: PlayerData; p2: PlayerData } {
		return { p1: this.players[0].getData(), p2: this.players[1].getData() };
	}
	updateBallPosition(dt: number): void {
		const { x, y } = this.ball.getXY();
		const radius = this.ballRadius;
		const pWidth = this.players[0].Width;
		const { s1, s2 } = {
			s1: this.players[0].Size,
			s2: this.players[1].Size,
		};
		const { x1, x2 } = { x1: this.players[0].X, x2: this.players[1].X };
		const { y1, y2 } = { y1: this.players[0].Y, y2: this.players[1].Y };
		//console.log("x1: ", x1, " x: ", x, "x2: ", x2);
		//console.log(y1);
		//console.log("--------");
		//console.log(x - radius <= x1 + pWidth);
		//console.log(y + radius > y1);
		//console.log(y - radius < y1 + s1);
		if (x + radius >= this.width) this.addScore(0);
		else if (x - radius <= 0) this.addScore(1);
		else {
			if (y + radius >= this.height || y - radius <= 0) this.ball.bounceY();
			if (
				(x - radius <= x1 + pWidth &&
					y + radius > y1 &&
					y - radius < y1 + s1) ||
				(x + radius >= x2 && y + radius > y2 && y - radius < y2 + s2)
			)
				this.ball.bounceX();
			this.ball.X = x + this.ball.dX * dt;
			this.ball.Y = y + this.ball.dY * dt;
		}
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
		//console.log("loop");
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
