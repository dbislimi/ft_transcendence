import Player from "./Player.ts";
import Ball from "./Ball.ts";

interface PlayerData {
	size: number;
	y: number;
	score: number;
}

type bounceParam = [player: null] | [player: Player, hitpoint: number];

export default class Field {
	private readonly height: number;
	private readonly width: number;
	private playerSpeed: number = 100;
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
	bounceBallX(reset?: boolean) {
		if (reset) {
			this.ball.dx = Math.random() - 0.5 < 0.5 ? -30 : 30;
			this.ball.dy = Math.random() * 120 - 60;
		}
		this.ball.dx *= -2;
		if (this.ball.dx > 200) this.ball.dx = 200;
	}
	bounceBallY(...arg: bounceParam) {
		const [player, hitpoint] = arg;

		if (player === null) this.ball.dy *= -1;
		else
			this.ball.dy =
				((2 * hitpoint) / player.size - 1) * Math.abs(this.ball.dx);
	}
	private addScore(player: number) {
		this.score[player]++;
		this.setBallPos();
		this.bounceBallX(true);
	}

	getBallData(): { radius: number; x: number; y: number } {
		return { radius: this.ballRadius, ...this.ball.getXY() };
	}
	getPlayersData(): { p1: PlayerData; p2: PlayerData } {
		return {
			p1: { ...this.players[0].getData(), score: this.score[0] },
			p2: { ...this.players[1].getData(), score: this.score[1] },
		};
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
			this.bounceBallY(null);
			nextY = Math.max(radius, Math.min(nextY, this.height - radius));
		}
		if (prevLeftEdge > face1 && nextLeftEdge <= face1) {
			const t = (face1 - prevLeftEdge) / (nextLeftEdge - prevLeftEdge);
			const yCross = y + (nextY - y) * t;

			if (yCross + radius >= y1 - 1 && yCross - radius <= y1 + s1 + 1) {
				nextX = face1 + radius;
				this.bounceBallX();
				this.bounceBallY(this.players[0], yCross - y1);
			}
		} else if (prevRightEdge < face2 && nextRightEdge >= face2) {
			const t = (face2 - prevRightEdge) / (nextRightEdge - prevRightEdge);
			const yCross = y + (nextY - y) * t;

			if (yCross + radius >= y2 - 1 && yCross - radius <= y2 + s2 + 1) {
				nextX = face2 - radius;
				this.bounceBallX();
				this.bounceBallY(this.players[1], yCross - y2);
			}
		}
		this.ball.x = nextX;
		this.ball.y = nextY;
		if (nextX + radius >= this.width) this.addScore(0);
		else if (nextX - radius <= 0) this.addScore(1);
	}
	updatePlayersPosition(dt: number) {
		const { p1, p2 } = { p1: this.players[0], p2: this.players[1] };
		if (p2.bot) {
			if (this.ball.y < p2.y) {
				p2.moveUp(true);
				p2.moveDown(false);
			} else if (this.ball.y > p2.y + p2.size) {
				p2.moveUp(false);
				p2.moveDown(true);
			}
		}
		if (p1.up && p1.down) return;
		if (p1.up && p1.y > 0) {
			if (p1.y - this.playerSpeed * dt < 0) p1.y = 0;
			else p1.y -= this.playerSpeed * dt;
		} else if (p1.down && p1.y + p1.size < this.height) {
			if (p1.y + this.playerSpeed * dt > this.height - p1.size)
				p1.y = this.height - p1.size;
			else p1.y += this.playerSpeed * dt;
		}
		if (p2.up && p2.y > 0) {
			if (p2.y - this.playerSpeed * dt < 0) p2.y = 0;
			else p2.y -= this.playerSpeed * dt;
		} else if (p2.down && p2.y + p1.size < this.height) {
			if (p2.y + this.playerSpeed * dt > this.height - p2.size)
				p2.y = this.height - p2.size;
			else p2.y += this.playerSpeed * dt;
		}
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
