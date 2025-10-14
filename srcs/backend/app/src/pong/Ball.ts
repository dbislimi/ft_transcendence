import Board from "./Board.ts";

const MAX_BALL_SPEED = 200;

export default class Ball {
	private ballRadius: number;
	x: number;
	y: number;
	speed: number;
	dx: number = 0;
	dy: number = 0;

	constructor(field: Board, size: number = 4) {
		this.x = field.W / 2;
		this.y = field.H / 2;
		this.dx = Math.random() - 0.5 < 0.5 ? -30 : 30;
		this.dy = Math.random() * 120 - 60;
		this.speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
		this.ballRadius = field.H / 70;
	}
	reset(field: Board) {
		this.x = field.W / 2;
		this.y = field.H / 2;
		this.dx = Math.random() - 0.5 < 0.5 ? -30 : 30;
		this.dy = Math.random() * 120 - 60;
		this.clampSpeed();
	}
	clampSpeed() {
		this.speed = Math.min(this.speed, MAX_BALL_SPEED);
		const angle = Math.atan2(this.dy, this.dx);
		this.dx = Math.cos(angle) * this.speed;
		this.dy = Math.sin(angle) * this.speed;
	}
	getXY(): { x: number; y: number } {
		return { x: this.x, y: this.y };
	}
	getNextXY(dt: number): { nextX: number; nextY: number } {
		return {
			nextX: this.x + this.dx * dt,
			nextY: this.y + this.dy * dt,
		};
	}
	get radius() {
		return this.ballRadius;
	}
}
