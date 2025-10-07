import Board from "./Board.ts";
import Bonus from "./Bonus.ts";

export type difficulty = "easy" | "medium" | "hard" | "impossible";

export default class Player {
	private static playerWidth: number;
	boardHeight: number;
	size: number;
	readonly x: number;
	y: number;
	speed: number = 90;
	private movingUp: boolean = false;
	private movingDown: boolean = false;
	bot: difficulty | undefined = undefined;
	readonly id: 0 | 1;
	ActiveBonus: Bonus[] = [];
	bonusCollectedTotal: number = 0; // cumulative bonuses picked up (for reward logic)

	constructor(field: Board, id: 0 | 1) {
		this.boardHeight = field.H;
		this.size = field.H / 4;
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
	reset() {
		//this.bot = undefined;
		this.ActiveBonus = this.ActiveBonus.filter((bonus) => {
			bonus.remove(this);
			return false;
		});
		this.y = this.boardHeight / 2 - this.size / 2;
		this.moveDown(false);
		this.moveUp(false);
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
