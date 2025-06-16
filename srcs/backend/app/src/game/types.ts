import type WebSocket from "ws";
const speed: number = 100;

interface PlayerData {
	size: number;
	y: number;
}

class Player {
	private static playerWidth: number;
	private playerSize: number;
	private xPos: number;
	private yPos: number;
	private movingUp: boolean = false;
	private movingDown: boolean = false;
	private isBot: boolean = true;

	constructor(field: Field, id: 0 | 1) {
		this.playerSize = field.H / 4;
		this.yPos = field.H / 2 - this.playerSize / 2;
		Player.playerWidth = field.W / 100;
		if (id == 0) this.xPos = Player.playerWidth;
		else this.xPos = field.W - 2 * Player.playerWidth;
	}

	public moveUp(state: boolean) {
		this.movingUp = state;
	}
	public moveDown(state: boolean) {
		this.movingDown = state;
	}

	getData(): { size: number; y: number } {
		return { size: this.playerSize, y: this.yPos };
	}

	get x() {
		return this.xPos;
	}
	get y() {
		return this.yPos;
	}
	get width() {
		return Player.playerWidth;
	}
	get size() {
		return this.playerSize;
	}
	get up() {
		return this.movingUp;
	}
	get down() {
		return this.movingDown;
	}
	get bot() {
		return this.isBot;
	}
	set bot(bool: boolean) {
		this.isBot = bool;
	}
	set x(x: number) {
		this.xPos = x;
	}
	set y(y: number) {
		this.yPos = y;
	}
}

class Ball {
	private ballRadius: number;
	private xPos: number;
	private yPos: number;
	private xVel: number = 0;
	private yVel: number = 0;

	constructor(field: Field, size: number = 4) {
		this.xPos = field.W / 2;
		this.yPos = field.H / 2;
		this.xVel = Math.random() - 0.5 < 0.5 ? -50 : 50;
		this.yVel = Math.random() * 60 - 30;
		this.xVel = 50;
		this.ballRadius = size / 2;
	}

	bounceX(): void {
		//console.log("bounce X");
		this.xVel = -this.xVel;
	}
	bounceY(): void {
		//console.log("bounce Y");

		this.yVel = -this.yVel;
	}
	set x(x: number) {
		this.xPos = x;
	}
	set y(y: number) {
		this.yPos = y;
	}
	getXY(): { x: number; y: number } {
		return { x: this.xPos, y: this.yPos };
	}
	getNextXY(dt: number): { nextX: number; nextY: number } {
		return {
			nextX: this.xPos + this.xVel * dt,
			nextY: this.yPos + this.yVel * dt,
		};
	}
	get y() {
		return this.yPos;
	}
	get dx() {
		return this.xVel;
	}
	get dy() {
		return this.yVel;
	}
	get radius() {
		return this.ballRadius;
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

	setBallPos(x: number = this.width / 2, y: number = this.height / 2) {
		this.ball.x = x;
		this.ball.y = y;
	}
	private addScore(player: number) {
		this.score[player]++;
		this.setBallPos();
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
		let { nextX, nextY } = this.ball.getNextXY(dt);
		const radius = this.ballRadius;
		const pWidth = this.players[0].width;
		const s1 = this.players[0].size;
		const s2 = this.players[1].size;
		const { y1, y2 } = { y1: this.players[0].y, y2: this.players[1].y };
		const face1 = this.players[0].x + pWidth;
		const face2 = this.players[1].x;
		const prevLeftEdge = x - radius;
		const nextLeftEdge = nextX - radius;
		const prevRightEdge = x + radius;
		const nextRightEdge = nextX + radius;
		if (nextY - radius <= 0 || nextY + radius >= this.height) {
			this.ball.bounceY();
			nextY = Math.max(radius, Math.min(nextY, this.height - radius));
		}
		if (prevLeftEdge > face1 && nextLeftEdge <= face1) {
			const t = (face1 - prevLeftEdge) / (nextLeftEdge - prevLeftEdge);
			const yCross = y + (nextY - y) * t;

			if (yCross >= y1 && yCross <= y1 + s1) {
				nextX = face1 + radius;
				this.ball.bounceX();
			}
		} else if (prevRightEdge < face2 && nextRightEdge >= face2) {
			const t = (face2 - prevRightEdge) / (nextRightEdge - prevRightEdge);
			const yCross = y + (nextY - y) * t;

			if (yCross >= y2 && yCross <= y2 + s2) {
				nextX = face2 - radius;
				this.ball.bounceX();
			}
		}
		this.ball.x = nextX;
		this.ball.y = nextY;
		if (nextX + radius >= this.width) {
			console.log("score 0");
			this.addScore(0);
		} else if (nextX - radius <= 0) {
			console.log("score 1");
			this.addScore(1);
		}
	}
	updatePlayersPosition(dt: number) {
		const { p1, p2 } = { p1: this.players[0], p2: this.players[1] };
		if (p2.bot) {
			if (this.ball.y < this.height - p2.size / 2 && this.ball.y > p2.size / 2)
				p2.y = this.ball.y - p2.size / 2;
		}
		if (p1.up && p1.down) return;
		if (p1.up && p1.y > 0) p1.y -= speed * dt;
		else if (p1.down && p1.y + p1.size < this.height) p1.y += speed * dt;
		if (p2.up && p2.y > 0) p2.y -= speed * dt;
		else if (p2.down && p2.y + p1.size < this.height) p2.y += speed * dt;
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
		return this.ball.radius;
	}
	getPlayerInput(id: 0 | 1): { up: boolean; down: boolean } {
		return { up: this.players[id].up, down: this.players[id].down };
	}
	connect() {
		this.players[0].bot = false;
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
