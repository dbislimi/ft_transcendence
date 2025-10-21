export interface PlayerStats {
	username: string;
	wins: number;
	losses: number;
}

export interface PlayerProfile {
	id: string;
	username: string;
	avatarUrl: string;
	createdAt: string; 
	totalPlayTimeMs: number;
	stats: PlayerStats;
}