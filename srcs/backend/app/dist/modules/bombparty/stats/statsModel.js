export class StatsModel {
    db;
    constructor(database) {
        this.db = database;
    }
    getDatabase() {
        return this.db;
    }
    createEmptyUserStats(userId) {
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
            updatedAt: new Date()
        };
    }
    mapRowToUserStats(row) {
        return {
            userId: row.user_id,
            totalMatches: row.total_matches,
            totalWins: row.total_wins,
            totalWordsSubmitted: row.total_words_submitted,
            totalValidWords: row.total_valid_words,
            bestStreak: row.best_streak,
            averageResponseTime: row.average_response_time,
            favoriteTrigram: row.favorite_trigram,
            totalPlayTime: row.total_play_time,
            winRate: row.total_matches > 0 ? (row.total_wins / row.total_matches) * 100 : 0,
            accuracy: row.total_words_submitted > 0 ? (row.total_valid_words / row.total_words_submitted) * 100 : 0,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
    mapRowToMatchHistory(row) {
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
            isWin: row.position === 1
        };
    }
    mapRowToTrigramStats(row) {
        return {
            trigram: row.trigram,
            timesUsed: row.times_used,
            successRate: row.success_rate * 100,
            averageTime: row.average_time,
            lastUsed: new Date(row.last_used)
        };
    }
    mapRowToRankingEntry(row, index) {
        return {
            userId: row.user_id,
            userName: row.user_name,
            totalWins: row.total_wins,
            totalMatches: row.total_matches,
            winRate: row.win_rate,
            bestStreak: row.best_streak,
            rank: index + 1
        };
    }
}
