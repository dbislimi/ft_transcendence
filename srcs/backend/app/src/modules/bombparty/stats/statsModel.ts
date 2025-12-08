import Database from "sqlite3";

export interface UserStats {
	userId: number;
	totalMatches: number;
	totalWins: number;
	totalWordsSubmitted: number;
	totalValidWords: number;
	bestStreak: number;
	averageResponseTime: number;
	favoriteTrigram?: string | null;
	totalPlayTime: number;
	winRate: number;
	accuracy: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface MatchHistory {
	id: number;
	userId: number;
	matchId: number;
	position: number;
	wordsSubmitted: number;
	validWords: number;
	finalLives: number;
	matchDuration: number;
	playedAt: Date;
	isWin: boolean;
}

export interface TrigramStats {
	trigram: string;
	timesUsed: number;
	successRate: number;
	averageTime: number;
	lastUsed: Date;
}

export interface DBResult<T = any> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface MatchData {
	isWin: boolean;
	wordsSubmitted: number;
	validWords: number;
	bestStreak: number;
	averageResponseTime: number;
	matchDuration: number;
}

export interface MatchHistoryData {
	position: number;
	wordsSubmitted: number;
	validWords: number;
	finalLives: number;
	matchDuration: number;
}

export interface RankingEntry {
	userId: number;
	userName: string;
	totalWins: number;
	totalMatches: number;
	winRate: number;
	bestStreak: number;
	rank: number;
}

export class StatsModel {
	private db: Database.Database;

	constructor(database: Database.Database) {
		this.db = database;
	}

	getDatabase(): Database.Database {
		return this.db;
	}

	createEmptyUserStats(userId: number): UserStats {
		return {
			userId,
			totalMatches: 0,
			totalWins: 0,
			totalWordsSubmitted: 0,
			totalValidWords: 0,
			bestStreak: 0,
			averageResponseTime: 0,
			favoriteTrigram: null,
			totalPlayTime: 0,
			winRate: 0,
			accuracy: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
	}

	mapRowToUserStats(row: any): UserStats {
		return {
			userId: row.user_id,
			totalMatches: row.total_matches,
			totalWins: row.total_wins,
			totalWordsSubmitted: row.total_words_submitted,
			totalValidWords: row.total_valid_words,
			bestStreak: row.best_streak,
			averageResponseTime: row.average_response_time,
			favoriteTrigram: row.favorite_trigram || null,
			totalPlayTime: row.total_play_time,
			winRate:
				row.total_matches > 0
					? (row.total_wins / row.total_matches) * 100
					: 0,
			accuracy:
				row.total_words_submitted > 0
					? (row.total_valid_words / row.total_words_submitted) * 100
					: 0,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		};
	}

	mapRowToMatchHistory(row: any): MatchHistory {
		return {
			id: row.id,
			userId: row.user_id,
			matchId: row.match_id,
			position: row.position,
			wordsSubmitted: row.words_submitted,
			validWords: row.valid_words,
			finalLives: row.final_lives,
			matchDuration: row.match_duration,
			playedAt: new Date(row.played_at),
			isWin: row.position === 1, // position 1 = gagnant
		};
	}

	mapRowToTrigramStats(row: any): TrigramStats {
		return {
			trigram: row.trigram,
			timesUsed: row.times_used,
			successRate: row.success_rate * 100, // db stocke en decimal (0-1), on convertit en %
			averageTime: row.average_time,
			lastUsed: new Date(row.last_used),
		};
	}

	mapRowToRankingEntry(row: any, index: number): RankingEntry {
		return {
			userId: row.user_id,
			userName: row.user_name,
			totalWins: row.total_wins,
			totalMatches: row.total_matches,
			winRate: row.win_rate,
			bestStreak: row.best_streak,
			rank: index + 1, // rank commence a 1, pas 0
		};
	}
}
