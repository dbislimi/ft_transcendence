import Board from "./Board.ts";

export type difficulty = "easy" | "medium" | "hard";

export default class Player {
	private static playerWidth: number;
	size: number;
	readonly x: number;
	y: number;
	private movingUp: boolean = false;
	private movingDown: boolean = false;
	bot: difficulty | undefined = undefined;
	readonly id: 0 | 1;

	constructor(field: Board, id: 0 | 1) {
		this.size = field.H / 6;
		this.y = field.H / 2 - this.size / 2;
		Player.playerWidth = field.W / 100;
		this.id = id;
		if (id == 0) this.x = Player.playerWidth;
		else this.x = field.W - 2 * Player.playerWidth;
	}

	public moveUp(state: boolean) {
		this.movingUp = state;
	}
	public moveDown(state: boolean) {
		this.movingDown = state;
	}

	getData(): { size: number; y: number } {
		return { size: this.size, y: this.y };
	}

	get width() {
		return Player.playerWidth;
	}
	get up() {
		return this.movingUp;
	}
	get down() {
		return this.movingDown;
	}
}
