import { AsyncLock } from '../../../utils/AsyncLock.js';
import type {
  DBResult,
  UserStats,
  MatchHistory,
  TrigramStats,
  MatchData,
  MatchHistoryData,
  RankingEntry
} from './statsModel.js';
import { StatsModel } from './statsModel.js';
import {
  computeUpdatedUserStats,
  computeNewUserStats,
  computeUpdatedTrigramStats,
  computeNewTrigramStats
} from './statsCompute.js';

export class StatsPersistence {
  private model: StatsModel;
  private lock = new AsyncLock();

  constructor(model: StatsModel) {
    this.model = model;
  }

  async updateUserStats(userId: number, matchData: MatchData): Promise<DBResult<void>> {
    return this.lock.acquire(async () => {
      return new Promise((resolve) => {
        const db = this.model.getDatabase();

        db.serialize(() => {
          db.run('BEGIN EXCLUSIVE TRANSACTION');

          db.get(
            'SELECT * FROM bp_user_stats WHERE user_id = ?',
            [userId],
            (err, existingStats) => {
              if (err) {
                console.error('stats error fetch', err);
                db.run('ROLLBACK');
                resolve({ success: false, error: err.message });
                return;
              }

              if (existingStats) {
                const computed = computeUpdatedUserStats(existingStats, matchData);

                db.run(
                  `UPDATE bp_user_stats SET 
                    total_matches = ?, 
                    total_wins = ?, 
                    total_words_submitted = ?, 
                    total_valid_words = ?, 
                    best_streak = ?, 
                    average_response_time = ?, 
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
                    computed.newTotalPlayTime,
                    userId
                  ],
                  function (err) {
                    if (err) {
                      console.error('stats error update', err);
                      db.run('ROLLBACK');
                      resolve({ success: false, error: err.message });
                    } else {
                      db.run('COMMIT');
                      resolve({ success: true });
                    }
                  }
                );
              } else {
                const computed = computeNewUserStats(userId, matchData);

                db.run(
                  `INSERT INTO bp_user_stats (
                    user_id, total_matches, total_wins, total_words_submitted, 
                    total_valid_words, best_streak, average_response_time, 
                    total_play_time
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    userId,
                    computed.totalMatches,
                    computed.totalWins,
                    computed.totalWordsSubmitted,
                    computed.totalValidWords,
                    computed.bestStreak,
                    computed.averageResponseTime,
                    computed.totalPlayTime
                  ],
                  function (err) {
                    if (err) {
                      console.error('stats error create', err);
                      db.run('ROLLBACK');
                      resolve({ success: false, error: err.message });
                    } else {
                      db.run('COMMIT');
                      resolve({ success: true });
                    }
                  }
                );
              }
            }
          );
        });
      });
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
        function (err) {
          if (err) {
            console.error(' [Stats] Error adding history:', err);
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, data: this.lastID });
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
            console.error(' [Stats] Error fetching user stats:', err);
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
            console.error(' [Stats] Error fetching history:', err);
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
    // table supprimee, retour vide
    return Promise.resolve({ success: true, data: [] });
  }

  async getGlobalRanking(limit: number = 50): Promise<DBResult<RankingEntry[]>> {
    return new Promise((resolve) => {
      this.model.getDatabase().all(
        `SELECT 
          s.user_id,
          u.display_name as user_name,
          s.total_wins,
          s.total_matches,
          s.best_streak,
          CASE 
            WHEN s.total_matches > 0 THEN (s.total_wins * 1.0 / s.total_matches) * 100 
            ELSE 0 
          END as win_rate
        FROM bp_user_stats s
        JOIN users u ON s.user_id = u.id
        WHERE s.total_matches > 0
        ORDER BY s.total_wins DESC, win_rate DESC, s.best_streak DESC
        LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) {
            console.error(' [Stats] Error fetching leaderboard:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          const ranking = rows.map((row, index) => this.model.mapRowToRankingEntry(row, index));
          resolve({ success: true, data: ranking });
        }
      );
    });
  }

  async getGlobalStats(): Promise<DBResult<any>> {
    return new Promise((resolve) => {
      this.model.getDatabase().get(
        `SELECT 
          COUNT(DISTINCT user_id) as total_players,
          COUNT(*) as total_matches,
          SUM(words_submitted) as total_words,
          SUM(valid_words) as total_valid_words,
          AVG(match_duration) as avg_match_duration,
          MAX(valid_words) as best_words_in_match
        FROM bp_match_history`,
        (err, row: any) => {
          if (err) {
            console.error(' [Stats] Error fetching global stats:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          resolve({ 
            success: true, 
            data: {
              totalPlayers: row.total_players || 0,
              totalMatches: row.total_matches || 0,
              totalWords: row.total_words || 0,
              totalValidWords: row.total_valid_words || 0,
              avgMatchDuration: Math.round(row.avg_match_duration || 0),
              bestWordsInMatch: row.best_words_in_match || 0
            }
          });
        }
      );
    });
  }

  async getGlobalMatchHistory(limit: number = 20, offset: number = 0): Promise<DBResult<any[]>> {
    return new Promise((resolve) => {
      this.model.getDatabase().all(
        `SELECT 
          h.id,
          h.user_id,
          u.display_name as user_name,
          h.match_id,
          h.position,
          h.words_submitted,
          h.valid_words,
          h.final_lives,
          h.match_duration,
          h.played_at
        FROM bp_match_history h
        JOIN users u ON h.user_id = u.id
        ORDER BY h.played_at DESC
        LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, rows: any[]) => {
          if (err) {
            console.error(' [Stats] Error fetching global history:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          const history = rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            userName: row.user_name,
            matchId: row.match_id,
            position: row.position,
            wordsSubmitted: row.words_submitted,
            validWords: row.valid_words,
            finalLives: row.final_lives,
            matchDuration: row.match_duration,
            playedAt: row.played_at
          }));

          resolve({ success: true, data: history });
        }
      );
    });
  }
}
