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
	lastProcessedInputId: number;
}

export interface Bonus {
	name: string;
	y: number;
	radius: number;
}

export interface ServerSnapshot {
	ball: Ball;
	players: {
		p1: Player;
		p2: Player;
	};
	bonuses: Bonus[];
	timestamp: number;
}

export interface PongState extends ServerSnapshot {
    serverUpdates: ServerSnapshot[]; 
}

