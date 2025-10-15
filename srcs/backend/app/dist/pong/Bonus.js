export default class BonusBase {
    y;
    duration = 10;
    radius;
    constructor(y, radius) {
        this.y = y;
        this.radius = radius;
    }
}
export class Bigger extends BonusBase {
    grow = 20;
    name = "Bigger";
    is = "bonus";
    apply(player) {
        const bonus = player.ActiveBonus.find(b => b.name === "Bigger");
        if (bonus !== undefined) {
            bonus.duration += 10;
            return (false);
        }
        else {
            player.size += this.grow;
            player.y = Math.max(0, Math.min(player.y - this.grow / 2, player.boardHeight - player.size));
        }
        return (true);
    }
    remove(player) {
        player.size -= this.grow;
    }
}
export class Smaller extends BonusBase {
    grow = 20;
    name = "Smaller";
    is = "penalty";
    apply(player) {
        const bonus = player.ActiveBonus.find(b => b.name === "Smaller");
        if (bonus !== undefined) {
            bonus.duration += 10;
            return (false);
        }
        else {
            player.size -= this.grow;
            player.y = Math.max(0, Math.min(player.y - this.grow / 2, player.boardHeight - player.size));
        }
        return (true);
    }
    remove(player) {
        player.size += this.grow;
    }
}
export class Faster extends BonusBase {
    speed = 20;
    name = "Faster";
    is = "bonus";
    apply(player) {
        const bonus = player.ActiveBonus.find(b => b.name === "Faster");
        if (bonus !== undefined) {
            bonus.duration += 10;
            return (false);
        }
        else
            player.speed += this.speed;
        return (true);
    }
    remove(player) {
        player.speed -= this.speed;
    }
}
