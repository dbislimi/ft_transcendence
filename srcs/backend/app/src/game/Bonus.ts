import Board from "./Board.ts"
import Player from "./Player.ts";

export default abstract class BonusBase {
	y: number;
	duration: number = 10;
	abstract name: string;
	abstract radius: number;
	abstract is: "bonus" | "penalty";

	constructor(height: number){
		this.y = Math.floor(Math.random() * (height - 20) + 10);
	}
	abstract apply(board: Board, player: Player): boolean;
	abstract remove(board: Board, player: Player): void;
}

export class Bigger extends BonusBase {
	grow: number = 20;
	name = "Bigger";
	radius = 10;
	is = "bonus" as "bonus";
	apply(board: Board, player: Player){
		const bonus = player.ActiveBonus.find((b) => b.name === "Bigger");
		if (bonus !== undefined){
			bonus.duration += 10;
			return (false);
		}
		else{
			player.size += this.grow;
			if (player.y < this.grow)
				player.y = 0;
			else
				player.y -= this.grow;
		}
		return (true);
	}
	remove(board: Board, player: Player){
		player.size -= this.grow;
	}

}

export class Faster extends BonusBase {
	speed: number = 20;
	name = "Faster";
	radius = 10;
	is = "bonus" as "bonus";
	apply(board: Board, player: Player){
		const bonus = player.ActiveBonus.find((b) => b.name === "Faster");
		if (bonus !== undefined){
			bonus.duration += 10;
			return (false);
		}
		else{
			player.speed += this.speed;
			if (player.speed < this.speed)
				player.speed = 0;
			else
				player.speed -= this.speed;
		}
		return (true);
	}
	remove(board: Board, player: Player){
		player.speed -= this.speed;
	}

}