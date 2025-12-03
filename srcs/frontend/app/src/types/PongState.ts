export interface Ball {
	x: number;
	y: number;
}

export interface Player {
	y: number;
	size: number;
	score: number;
	movingUp: boolean;
	movingDown: boolean;
}

export interface Bonus {
	name: string;
	y: number;
	radius: number;
}

export interface PongState {
	ball: Ball;
	players: {
		p1: Player;
		p2: Player;
	};
	bonuses: Bonus[];
}
