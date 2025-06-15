import type WebSocket from "ws";
const speed: number = 50;

interface PlayerData {
	size: number;
	y: number;
}

class Player {
	private static width: number;
	private size: number;
	private x: number;
	private y: number;
	private up: boolean = false;
	private down: boolean = false;

	constructor(field: Field, id: 0 | 1) {
		this.size = field.H / 4;
		this.y = field.H / 2 - this.size / 2;
		Player.width = field.W / 50;
		if (id == 0) this.x = Player.width;
		else this.x = field.W - 2 * Player.width;
	}

	public moveUp(state: boolean) {
		this.up = state;
	}
	public moveDown(state: boolean) {
		this.down = state;
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
	get Up() {
		return this.up;
	}
	get Down() {
		return this.down;
	}
	set X(x: number) {
		this.x = x;
	}
	set Y(y: number) {
		this.y = y;
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
	players: Player[];
	private ball: Ball;
	private score: number[] = [0, 0];

	constructor(height: number = 100, width: number = 200) {
		this.height = height;
		this.width = width;
		this.ball = new Ball(this);
		this.players = [new Player(this, 0), new Player(this, 1)];
	}

	private addScore(player: number) {
		this.score[player]++;
		this.ball.X = this.width / 2;
		this.ball.Y = this.height / 2;
		this.ball.bounceX();
	}

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

		if (x + radius >= this.width) this.addScore(0);
		else if (x - radius <= 0) this.addScore(1);
		else {
			if (y + radius >= this.height || y - radius <= 0)
				this.ball.bounceY();
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
	updatePlayersPosition(dt: number) {
		const { p1, p2 } = { p1: this.players[0], p2: this.players[1] };
		if (p1.Up && p1.Y > 0) p1.Y -= speed * dt;
		else if (p1.Down && p1.Y + p1.Size < this.height) p1.Y += speed * dt;
		if (p2.Up && p2.Y > 0) p2.Y -= speed * dt;
		else if (p2.Down && p2.Y + p1.Size < this.height) p2.Y += speed * dt;
	}
	update(dt: number) {
		this.updatePlayersPosition(dt);
		this.updateBallPosition(dt);
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
	getPlayerInput(id: 0 | 1): { up: boolean; down: boolean } {
		return { up: this.players[id].Up, down: this.players[id].Down };
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
	up(type: string) {
		if (!this.field.players[0].Up && type === "press"){
			
			console.log("debug");
			this.field.players[0].moveUp(true);
		}
		else if (this.field.players[0].Up && type === "release")
			this.field.players[0].moveUp(false);
	}
	down(type: string) {
		if (!this.field.players[0].Down && type === "press")
			this.field.players[0].moveDown(true);
		else if (this.field.players[0].Down && type === "release")
			this.field.players[0].moveDown(false);
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
