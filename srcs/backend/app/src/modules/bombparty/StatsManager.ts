import Database from 'sqlite3';
import {
  type UserStats,
  type MatchHistory,
  type TrigramStats,
  type DBResult,
  type MatchData,
  type MatchHistoryData,
  type RankingEntry,
  StatsModel,
  StatsPersistence
} from './stats/index.js';

export class BombPartyStatsManager {
  private persistence: StatsPersistence;

  constructor(database: Database.Database) {
    const model = new StatsModel(database);
    this.persistence = new StatsPersistence(model);
  }

  async updateUserStats(userId: number, matchData: MatchData): Promise<DBResult<void>> {
    return this.persistence.updateUserStats(userId, matchData);
  }

  async addMatchHistory(
    userId: number,
    matchId: number,
    matchData: MatchHistoryData
  ): Promise<DBResult<number>> {
    return this.persistence.addMatchHistory(userId, matchId, matchData);
  }

  async updateTrigramStats(
    userId: number,
    trigram: string,
    isSuccess: boolean,
    responseTime: number
  ): Promise<DBResult<void>> {
    return this.persistence.updateTrigramStats(userId, trigram, isSuccess, responseTime);
  }

  async getUserStats(userId: number): Promise<DBResult<UserStats>> {
    return this.persistence.getUserStats(userId);
  }

  async getUserMatchHistory(
    userId: number, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<DBResult<MatchHistory[]>> {
    return this.persistence.getUserMatchHistory(userId, limit, offset);
  }

  async getUserTrigramStats(
    userId: number, 
    limit: number = 10
  ): Promise<DBResult<TrigramStats[]>> {
    return this.persistence.getUserTrigramStats(userId, limit);
  }

  async getGlobalRanking(limit: number = 50): Promise<DBResult<RankingEntry[]>> {
    return this.persistence.getGlobalRanking(limit);
  }
}
