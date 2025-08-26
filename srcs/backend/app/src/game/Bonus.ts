import Board from "./Board.ts"
import Player from "./Player";

export default abstract class BonusBase {
	y: number;
	duration: number = 10;
	abstract name: string;
	abstract radius: number;

	constructor(height: number){
		this.y = Math.floor(Math.random() * height);
	}
	abstract apply(board: Board, player: Player): void;
	abstract remove(board: Board, player: Player): void;
}

export class Bigger extends BonusBase {
	name = "Bigger";
	radius = 10;
	apply(board: Board, player: Player){
		player.size += 20;
	}
	remove(board: Board, player: Player){
		player.size -= 20;
	}

}