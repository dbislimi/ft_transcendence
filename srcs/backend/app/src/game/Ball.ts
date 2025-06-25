import Board from "./Board.ts";

export default class Ball {
	private ballRadius: number;
	private xPos: number;
	private yPos: number;
	private xVel: number = 30;
	private yVel: number = 60;

	constructor(field: Board, size: number = 4) {
		this.xPos = field.W / 2;
		this.yPos = field.H / 2;
		this.xVel = Math.random() - 0.5 < 0.5 ? -30 : 30;
		this.yVel = Math.random() * 120 - 60;
		this.ballRadius = field.H / 70;
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
	set dx(dx: number) {
		this.xVel = dx;
	}
	set dy(dy: number) {
		this.yVel = dy;
	}
}
