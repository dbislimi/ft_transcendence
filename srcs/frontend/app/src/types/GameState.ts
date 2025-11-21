interface Player {
	size: number;
	y: number;
	score: number;
}

interface Bonus {
	y: number;
	name: string;
	radius: number;
}

interface Bonuses {
	count: number;
	bonuses: Bonus[];
}

interface Players {
	p1: Player;
	p2: Player;
}

interface Ball {
	radius: number;
	x: number;
	y: number;
	speed: number;
}

export interface GameState {
	ball: Ball;
	players: Players;
	bonuses: Bonuses;
}
