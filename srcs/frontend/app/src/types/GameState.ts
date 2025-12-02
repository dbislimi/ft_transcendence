export interface Ball {
	x: number;
	y: number;
}

export interface Player {
	y: number;
	size: number;
	score: number;
}

export interface Bonus {
	name: string;
	y: number;
	radius: number;
}

export interface GameState {
	ball: Ball;
	players: {
		p1: Player;
		p2: Player;
	};
	bonuses: Bonus[];
}
