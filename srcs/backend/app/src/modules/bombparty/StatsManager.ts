import Database from 'sqlite3';

/**
 * Interface pour les statistiques utilisateur
 */
export interface UserStats {
  userId: number;
  totalMatches: number;
  totalWins: number;
  totalWordsSubmitted: number;
  totalValidWords: number;
  bestStreak: number;
  averageResponseTime: number;
  favoriteTrigram: string | null;
  totalPlayTime: number;
  winRate: number;
  accuracy: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour l'historique des parties
 */
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

/**
 * Interface pour les statistiques de trigrammes
 */
export interface TrigramStats {
  trigram: string;
  timesUsed: number;
  successRate: number;
  averageTime: number;
  lastUsed: Date;
}

/**
 * Interface pour les résultats de base de données
 */
export interface DBResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Gestionnaire des statistiques Bomb Party
 */
export class BombPartyStatsManager {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  /**
   * Met à jour les statistiques d'un utilisateur après une partie
   */
  async updateUserStats(
    userId: number,
    matchData: {
      isWin: boolean;
      wordsSubmitted: number;
      validWords: number;
      bestStreak: number;
      averageResponseTime: number;
      matchDuration: number;
      favoriteTrigram?: string;
    }
  ): Promise<DBResult<void>> {
    return new Promise((resolve) => {
      this.db.get(
        'SELECT * FROM bp_user_stats WHERE user_id = ?',
        [userId],
        (err, existingStats) => {
          if (err) {
            console.error('❌ [Stats] Erreur récupération stats:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          if (existingStats) {
            const newTotalMatches = existingStats.total_matches + 1;
            const newTotalWins = existingStats.total_wins + (matchData.isWin ? 1 : 0);
            const newTotalWordsSubmitted = existingStats.total_words_submitted + matchData.wordsSubmitted;
            const newTotalValidWords = existingStats.total_valid_words + matchData.validWords;
            const newBestStreak = Math.max(existingStats.best_streak, matchData.bestStreak);
            const newTotalPlayTime = existingStats.total_play_time + matchData.matchDuration;
            
            const totalResponseTime = existingStats.average_response_time * existingStats.total_words_submitted + 
                                    matchData.averageResponseTime * matchData.wordsSubmitted;
            const newAverageResponseTime = newTotalWordsSubmitted > 0 ? 
              totalResponseTime / newTotalWordsSubmitted : 0;

            this.db.run(
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
                newTotalMatches,
                newTotalWins,
                newTotalWordsSubmitted,
                newTotalValidWords,
                newBestStreak,
                newAverageResponseTime,
                matchData.favoriteTrigram,
                newTotalPlayTime,
                userId
              ],
              function(err) {
                if (err) {
                  console.error('❌ [Stats] Erreur mise à jour stats:', err);
                  resolve({ success: false, error: err.message });
                } else {
                  resolve({ success: true });
                }
              }
            );
          } else {
            this.db.run(
              `INSERT INTO bp_user_stats (
                user_id, total_matches, total_wins, total_words_submitted, 
                total_valid_words, best_streak, average_response_time, 
                favorite_trigram, total_play_time
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                userId,
                1,
                matchData.isWin ? 1 : 0,
                matchData.wordsSubmitted,
                matchData.validWords,
                matchData.bestStreak,
                matchData.averageResponseTime,
                matchData.favoriteTrigram,
                matchData.matchDuration
              ],
              function(err) {
                if (err) {
                  console.error('❌ [Stats] Erreur création stats:', err);
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

  /**
   * Ajoute une entrée à l'historique des parties
   */
  async addMatchHistory(
    userId: number,
    matchId: number,
    matchData: {
      position: number;
      wordsSubmitted: number;
      validWords: number;
      finalLives: number;
      matchDuration: number;
    }
  ): Promise<DBResult<number>> {
    return new Promise((resolve) => {
      this.db.run(
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
            console.error('❌ [Stats] Erreur ajout historique:', err);
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, data: this.lastID });
          }
        }
      );
    });
  }

  /**
   * Met à jour les statistiques de trigrammes
   */
  async updateTrigramStats(
    userId: number,
    trigram: string,
    isSuccess: boolean,
    responseTime: number
  ): Promise<DBResult<void>> {
    return new Promise((resolve) => {
      this.db.get(
        'SELECT * FROM bp_trigram_stats WHERE user_id = ? AND trigram = ?',
        [userId, trigram],
        (err, existingStats) => {
          if (err) {
            console.error('❌ [Stats] Erreur récupération trigram stats:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          if (existingStats) {
            const newTimesUsed = existingStats.times_used + 1;
            const newSuccessCount = Math.round(existingStats.success_rate * existingStats.times_used) + (isSuccess ? 1 : 0);
            const newSuccessRate = newSuccessCount / newTimesUsed;
            
            const totalTime = existingStats.average_time * existingStats.times_used + responseTime;
            const newAverageTime = totalTime / newTimesUsed;

            this.db.run(
              `UPDATE bp_trigram_stats SET 
                times_used = ?, 
                success_rate = ?, 
                average_time = ?,
                last_used = CURRENT_TIMESTAMP
               WHERE user_id = ? AND trigram = ?`,
              [newTimesUsed, newSuccessRate, newAverageTime, userId, trigram],
              function(err) {
                if (err) {
                  console.error('❌ [Stats] Erreur mise à jour trigram stats:', err);
                  resolve({ success: false, error: err.message });
                } else {
                  resolve({ success: true });
                }
              }
            );
          } else {
            this.db.run(
              `INSERT INTO bp_trigram_stats (
                user_id, trigram, times_used, success_rate, average_time
              ) VALUES (?, ?, 1, ?, ?)`,
              [userId, trigram, isSuccess ? 1 : 0, responseTime],
              function(err) {
                if (err) {
                  console.error('❌ [Stats] Erreur création trigram stats:', err);
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

  /**
   * Récupère les statistiques d'un utilisateur
   */
  async getUserStats(userId: number): Promise<DBResult<UserStats>> {
    return new Promise((resolve) => {
      this.db.get(
        'SELECT * FROM bp_user_stats WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) {
            console.error('❌ [Stats] Erreur récupération stats user:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          if (!row) {
            const emptyStats: UserStats = {
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
            resolve({ success: true, data: emptyStats });
            return;
          }

          const stats: UserStats = {
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

          resolve({ success: true, data: stats });
        }
      );
    });
  }

  /**
   * Récupère l'historique des parties d'un utilisateur
   */
  async getUserMatchHistory(
    userId: number, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<DBResult<MatchHistory[]>> {
    return new Promise((resolve) => {
      this.db.all(
        `SELECT * FROM bp_match_history 
         WHERE user_id = ? 
         ORDER BY played_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset],
        (err, rows) => {
          if (err) {
            console.error('❌ [Stats] Erreur récupération historique:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          const history: MatchHistory[] = rows.map(row => ({
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
          }));

          resolve({ success: true, data: history });
        }
      );
    });
  }

  /**
   * Récupère les statistiques de trigrammes d'un utilisateur
   */
  async getUserTrigramStats(
    userId: number, 
    limit: number = 10
  ): Promise<DBResult<TrigramStats[]>> {
    return new Promise((resolve) => {
      this.db.all(
        `SELECT * FROM bp_trigram_stats 
         WHERE user_id = ? 
         ORDER BY times_used DESC, success_rate DESC 
         LIMIT ?`,
        [userId, limit],
        (err, rows) => {
          if (err) {
            console.error('❌ [Stats] Erreur récupération trigram stats:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          const stats: TrigramStats[] = rows.map(row => ({
            trigram: row.trigram,
            timesUsed: row.times_used,
            successRate: row.success_rate * 100, // Convertir en pourcentage
            averageTime: row.average_time,
            lastUsed: new Date(row.last_used)
          }));

          resolve({ success: true, data: stats });
        }
      );
    });
  }

  /**
   * Récupère le classement global des joueurs
   */
  async getGlobalRanking(limit: number = 50): Promise<DBResult<Array<{
    userId: number;
    userName: string;
    totalWins: number;
    totalMatches: number;
    winRate: number;
    bestStreak: number;
    rank: number;
  }>>> {
    return new Promise((resolve) => {
      this.db.all(
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
        WHERE s.total_matches >= 5  -- Au moins 5 parties pour être classé
        ORDER BY s.total_wins DESC, win_rate DESC, s.best_streak DESC
        LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) {
            console.error('❌ [Stats] Erreur récupération classement:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          const ranking = rows.map((row, index) => ({
            userId: row.user_id,
            userName: row.user_name,
            totalWins: row.total_wins,
            totalMatches: row.total_matches,
            winRate: row.win_rate,
            bestStreak: row.best_streak,
            rank: index + 1
          }));

          resolve({ success: true, data: ranking });
        }
      );
    });
  }
}
