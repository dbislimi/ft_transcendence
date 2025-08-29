import Board from "./Board.ts";

export default class Ball {
	private ballRadius: number;
	x: number;
	y: number;
	speed: number;
	dx: number = 30;
	dy: number = 60;

	constructor(field: Board, size: number = 4) {
		this.x = field.W / 2;
		this.y = field.H / 2;
		this.dx = Math.random() - 0.5 < 0.5 ? -30 : 30;
		this.dy = Math.random() * 120 - 60;
		this.speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
		this.ballRadius = field.H / 70;
	}
	reset(field: Board){
		this.x = field.W / 2;
		this.y = field.H / 2;
		this.dx = Math.random() - 0.5 < 0.5 ? -30 : 30;
		this.dy = Math.random() * 120 - 60;
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
