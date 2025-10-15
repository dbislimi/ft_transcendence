import { StatsModel, StatsPersistence } from './stats';
export class BombPartyStatsManager {
    persistence;
    constructor(database) {
        const model = new StatsModel(database);
        this.persistence = new StatsPersistence(model);
    }
    async updateUserStats(userId, matchData) {
        return this.persistence.updateUserStats(userId, matchData);
    }
    async addMatchHistory(userId, matchId, matchData) {
        return this.persistence.addMatchHistory(userId, matchId, matchData);
    }
    async updateTrigramStats(userId, trigram, isSuccess, responseTime) {
        return this.persistence.updateTrigramStats(userId, trigram, isSuccess, responseTime);
    }
    async getUserStats(userId) {
        return this.persistence.getUserStats(userId);
    }
    async getUserMatchHistory(userId, limit = 20, offset = 0) {
        return this.persistence.getUserMatchHistory(userId, limit, offset);
    }
    async getUserTrigramStats(userId, limit = 10) {
        return this.persistence.getUserTrigramStats(userId, limit);
    }
    async getGlobalRanking(limit = 50) {
        return this.persistence.getGlobalRanking(limit);
    }
}
