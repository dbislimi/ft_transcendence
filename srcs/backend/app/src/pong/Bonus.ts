import Player from './Player.js';

export abstract class BonusBase {
  y: number;
  duration: number = 10;
  radius: number;
  abstract name: string;
  abstract is: "bonus" | "penalty";

  constructor(y: number, radius: number) {
    this.y = y;
    this.radius = radius;
  }
  abstract apply(player: Player): boolean;
  abstract remove(player: Player): void;
}

export class Bigger extends BonusBase {
	grow: number = 15;
	name = "Bigger";
	is = "bonus" as "bonus";
	apply(player: Player){
		const bonus = player.ActiveBonus.find(b => b.name === "Bigger");
		if (bonus !== undefined){
			bonus.duration += 10;
			return (false);
		}
		else{
			player.size += this.grow;
			player.y = Math.max(0, Math.min(player.y - this.grow / 2, player.boardHeight - player.size));
		}
		return (true);
	}
	remove(player: Player){
		player.size -= this.grow;
	}
}

export class Smaller extends BonusBase {
	grow: number = 10;
	name = "Smaller";
	is = "penalty" as "penalty";
	apply(player: Player){
		const bonus = player.ActiveBonus.find(b => b.name === "Smaller");
		if (bonus !== undefined){
			bonus.duration += 10;
			return (false);
		}
		else{
			player.size -= this.grow;
			player.y = Math.max(0, Math.min(player.y - this.grow / 2, player.boardHeight - player.size));
		}
		return (true);
	}
	remove(player: Player){
		player.size += this.grow;
	}
}

export class Faster extends BonusBase {
  speed: number = 20;
  name = "Faster";
  is = "bonus" as "bonus";
  apply(player: Player) {
    const bonus = player.ActiveBonus.find((b) => b.name === "Faster");
    if (bonus !== undefined) {
      bonus.duration += 10;
      return false;
    } else player.speed += this.speed;
    return true;
  }
  remove(player: Player) {
    player.speed -= this.speed;
  }
}