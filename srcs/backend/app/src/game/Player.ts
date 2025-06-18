import Field from "./Field.ts";

export default class Player {
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
