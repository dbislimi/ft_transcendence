import type { 
  DBResult, 
  UserStats, 
  MatchHistory, 
  TrigramStats, 
  MatchData, 
  MatchHistoryData,
  RankingEntry 
} from './statsModel';
import { StatsModel } from './statsModel';
import { 
  computeUpdatedUserStats, 
  computeNewUserStats, 
  computeUpdatedTrigramStats, 
  computeNewTrigramStats 
} from './statsCompute';

export class StatsPersistence {
  private model: StatsModel;

  constructor(model: StatsModel) {
    this.model = model;
  }

  async updateUserStats(userId: number, matchData: MatchData): Promise<DBResult<void>> {
    return new Promise((resolve) => {
      this.model.getDatabase().get(
        'SELECT * FROM bp_user_stats WHERE user_id = ?',
        [userId],
        (err, existingStats) => {
          if (err) {
            console.error(' [Stats] Erreur récupération stats:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          if (existingStats) {
            const computed = computeUpdatedUserStats(existingStats, matchData);
            
            this.model.getDatabase().run(
              `UPDATE bp_user_stats SET 
                total_matches = ?, 
                total_wins = ?, 
                total_words_submitted = ?, 
                total_valid_words = ?, 
                best_streak = ?, 
                average_response_time = ?, 
                favorite_trigram = COALESCE(?, favorite_trigram),
                total_play_time = ?,
                updated_at = CURRENT_TIMESTAMP
               WHERE user_id = ?`,
              [
                computed.newTotalMatches,
                computed.newTotalWins,
                computed.newTotalWordsSubmitted,
                computed.newTotalValidWords,
                computed.newBestStreak,
                computed.newAverageResponseTime,
                matchData.favoriteTrigram,
                computed.newTotalPlayTime,
                userId
              ],
              function(err) {
                if (err) {
                  console.error(' [Stats] Erreur mise à jour stats:', err);
                  resolve({ success: false, error: err.message });
                } else {
                  resolve({ success: true });
                }
              }
            );
          } else {
            const computed = computeNewUserStats(userId, matchData);
            
            this.model.getDatabase().run(
              `INSERT INTO bp_user_stats (
                user_id, total_matches, total_wins, total_words_submitted, 
                total_valid_words, best_streak, average_response_time, 
                favorite_trigram, total_play_time
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                userId,
                computed.totalMatches,
                computed.totalWins,
                computed.totalWordsSubmitted,
                computed.totalValidWords,
                computed.bestStreak,
                computed.averageResponseTime,
                matchData.favoriteTrigram,
                computed.totalPlayTime
              ],
              function(err) {
                if (err) {
                  console.error(' [Stats] Erreur création stats:', err);
                  resolve({ success: false, error: err.message });
                } else {
                  resolve({ success: true });
                }
              }
            );
          }
        }
      );
    });
  }

  async addMatchHistory(
    userId: number,
    matchId: number,
    matchData: MatchHistoryData
  ): Promise<DBResult<number>> {
    return new Promise((resolve) => {
      this.model.getDatabase().run(
        `INSERT INTO bp_match_history (
          user_id, match_id, position, words_submitted, 
          valid_words, final_lives, match_duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          matchId,
          matchData.position,
          matchData.wordsSubmitted,
          matchData.validWords,
          matchData.finalLives,
          matchData.matchDuration
        ],
        function(err) {
          if (err) {
            console.error(' [Stats] Erreur ajout historique:', err);
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, data: this.lastID });
          }
        }
      );
    });
  }

  async updateTrigramStats(
    userId: number,
    trigram: string,
    isSuccess: boolean,
    responseTime: number
  ): Promise<DBResult<void>> {
    return new Promise((resolve) => {
      this.model.getDatabase().get(
        'SELECT * FROM bp_trigram_stats WHERE user_id = ? AND trigram = ?',
        [userId, trigram],
        (err, existingStats) => {
          if (err) {
            console.error(' [Stats] Erreur récupération trigram stats:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          if (existingStats) {
            const computed = computeUpdatedTrigramStats(existingStats, isSuccess, responseTime);
            
            this.model.getDatabase().run(
              `UPDATE bp_trigram_stats SET 
                times_used = ?, 
                success_rate = ?, 
                average_time = ?,
                last_used = CURRENT_TIMESTAMP
               WHERE user_id = ? AND trigram = ?`,
              [computed.newTimesUsed, computed.newSuccessRate, computed.newAverageTime, userId, trigram],
              function(err) {
                if (err) {
                  console.error(' [Stats] Erreur mise à jour trigram stats:', err);
                  resolve({ success: false, error: err.message });
                } else {
                  resolve({ success: true });
                }
              }
            );
          } else {
            const computed = computeNewTrigramStats(isSuccess, responseTime);
            
            this.model.getDatabase().run(
              `INSERT INTO bp_trigram_stats (
                user_id, trigram, times_used, success_rate, average_time
              ) VALUES (?, ?, ?, ?, ?)`,
              [userId, trigram, computed.timesUsed, computed.successRate, computed.averageTime],
              function(err) {
                if (err) {
                  console.error(' [Stats] Erreur création trigram stats:', err);
                  resolve({ success: false, error: err.message });
                } else {
                  resolve({ success: true });
                }
              }
            );
          }
        }
      );
    });
  }

  async getUserStats(userId: number): Promise<DBResult<UserStats>> {
    return new Promise((resolve) => {
      this.model.getDatabase().get(
        'SELECT * FROM bp_user_stats WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) {
            console.error(' [Stats] Erreur récupération stats user:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          if (!row) {
            resolve({ success: true, data: this.model.createEmptyUserStats(userId) });
            return;
          }

          resolve({ success: true, data: this.model.mapRowToUserStats(row) });
        }
      );
    });
  }

  async getUserMatchHistory(
    userId: number, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<DBResult<MatchHistory[]>> {
    return new Promise((resolve) => {
      this.model.getDatabase().all(
        `SELECT * FROM bp_match_history 
         WHERE user_id = ? 
         ORDER BY played_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset],
        (err, rows) => {
          if (err) {
            console.error(' [Stats] Erreur récupération historique:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          const history: MatchHistory[] = rows.map(row => this.model.mapRowToMatchHistory(row));
          resolve({ success: true, data: history });
        }
      );
    });
  }

  async getUserTrigramStats(
    userId: number, 
    limit: number = 10
  ): Promise<DBResult<TrigramStats[]>> {
    return new Promise((resolve) => {
      this.model.getDatabase().all(
        `SELECT * FROM bp_trigram_stats 
         WHERE user_id = ? 
         ORDER BY times_used DESC, success_rate DESC 
         LIMIT ?`,
        [userId, limit],
        (err, rows) => {
          if (err) {
            console.error(' [Stats] Erreur récupération trigram stats:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          const stats: TrigramStats[] = rows.map(row => this.model.mapRowToTrigramStats(row));
          resolve({ success: true, data: stats });
        }
      );
    });
  }

  async getGlobalRanking(limit: number = 50): Promise<DBResult<RankingEntry[]>> {
    return new Promise((resolve) => {
      this.model.getDatabase().all(
        `SELECT 
          s.user_id,
          u.name as user_name,
          s.total_wins,
          s.total_matches,
          s.best_streak,
          CASE 
            WHEN s.total_matches > 0 THEN (s.total_wins * 1.0 / s.total_matches) * 100 
            ELSE 0 
          END as win_rate
        FROM bp_user_stats s
        JOIN users u ON s.user_id = u.id
        WHERE s.total_matches >= 5
        ORDER BY s.total_wins DESC, win_rate DESC, s.best_streak DESC
        LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) {
            console.error(' [Stats] Erreur récupération classement:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          const ranking = rows.map((row, index) => this.model.mapRowToRankingEntry(row, index));
          resolve({ success: true, data: ranking });
        }
      );
    });
  }
}
