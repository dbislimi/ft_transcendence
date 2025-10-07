/**
 * Database module pour Bomb Party
 *
 * Gère la persistance des parties et statistiques
 */
/**
 * Gestionnaire de base de données pour Bomb Party
 */
export class BombPartyDatabase {
    db;
    constructor(database) {
        this.db = database;
        this.initializeTables();
    }
    /**
     * Initialise les tables Bomb Party
     */
    initializeTables() {
        this.db.serialize(() => {
            // Table des parties
            this.db.run(`
        CREATE TABLE IF NOT EXISTS bp_matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          started_at DATETIME,
          ended_at DATETIME,
          winner_id TEXT,
          total_rounds INTEGER DEFAULT 0,
          final_state TEXT
        );
      `);
            // Table des participants
            this.db.run(`
        CREATE TABLE IF NOT EXISTS bp_participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id INTEGER NOT NULL,
          player_id TEXT NOT NULL,
          player_name TEXT NOT NULL,
          words_submitted INTEGER DEFAULT 0,
          valid_words INTEGER DEFAULT 0,
          max_streak INTEGER DEFAULT 0,
          final_lives INTEGER DEFAULT 0,
          is_eliminated BOOLEAN DEFAULT 0,
          FOREIGN KEY (match_id) REFERENCES bp_matches (id)
        );
      `);
            // Index pour les performances
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_bp_matches_room_id ON bp_matches (room_id);`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_bp_participants_match_id ON bp_participants (match_id);`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_bp_participants_player_id ON bp_participants (player_id);`);
        });
        console.log('📊 [BombParty] Tables de base de données initialisées');
    }
    /**
     * Crée une nouvelle entrée de partie
     */
    async createMatch(roomId) {
        return new Promise((resolve) => {
            const query = `
        INSERT INTO bp_matches (room_id, created_at) 
        VALUES (?, CURRENT_TIMESTAMP)
      `;
            this.db.run(query, [roomId], function (err) {
                if (err) {
                    console.error('❌ [BombParty] Erreur création match:', err);
                    resolve({ success: false, error: err.message });
                }
                else {
                    console.log('✅ [BombParty] Match créé:', { matchId: this.lastID, roomId });
                    resolve({ success: true, data: this.lastID });
                }
            });
        });
    }
    /**
     * Met à jour le début d'une partie
     */
    async startMatch(matchId) {
        return new Promise((resolve) => {
            const query = `
        UPDATE bp_matches 
        SET started_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
            this.db.run(query, [matchId], function (err) {
                if (err) {
                    console.error('❌ [BombParty] Erreur démarrage match:', err);
                    resolve({ success: false, error: err.message });
                }
                else {
                    console.log('✅ [BombParty] Match démarré:', matchId);
                    resolve({ success: true });
                }
            });
        });
    }
    /**
     * Termine une partie avec les résultats
     */
    async endMatch(matchId, winnerId, totalRounds, finalState) {
        return new Promise((resolve) => {
            const query = `
        UPDATE bp_matches 
        SET ended_at = CURRENT_TIMESTAMP, 
            winner_id = ?, 
            total_rounds = ?, 
            final_state = ?
        WHERE id = ?
      `;
            const finalStateJson = JSON.stringify(finalState);
            this.db.run(query, [winnerId, totalRounds, finalStateJson, matchId], function (err) {
                if (err) {
                    console.error('❌ [BombParty] Erreur fin match:', err);
                    resolve({ success: false, error: err.message });
                }
                else {
                    console.log('✅ [BombParty] Match terminé:', { matchId, winnerId, rounds: totalRounds });
                    resolve({ success: true });
                }
            });
        });
    }
    /**
     * Ajoute un participant à une partie
     */
    async addParticipant(matchId, playerId, playerName) {
        return new Promise((resolve) => {
            const query = `
        INSERT INTO bp_participants (match_id, player_id, player_name) 
        VALUES (?, ?, ?)
      `;
            this.db.run(query, [matchId, playerId, playerName], function (err) {
                if (err) {
                    console.error('❌ [BombParty] Erreur ajout participant:', err);
                    resolve({ success: false, error: err.message });
                }
                else {
                    console.log('✅ [BombParty] Participant ajouté:', {
                        participantId: this.lastID,
                        matchId,
                        playerId,
                        playerName
                    });
                    resolve({ success: true, data: this.lastID });
                }
            });
        });
    }
    /**
     * Met à jour les statistiques d'un participant
     */
    async updateParticipantStats(matchId, playerId, stats) {
        return new Promise((resolve) => {
            const query = `
        UPDATE bp_participants 
        SET words_submitted = ?, 
            valid_words = ?, 
            max_streak = ?, 
            final_lives = ?, 
            is_eliminated = ?
        WHERE match_id = ? AND player_id = ?
      `;
            this.db.run(query, [
                stats.wordsSubmitted,
                stats.validWords,
                stats.maxStreak,
                stats.finalLives,
                stats.isEliminated ? 1 : 0,
                matchId,
                playerId
            ], function (err) {
                if (err) {
                    console.error('❌ [BombParty] Erreur update participant:', err);
                    resolve({ success: false, error: err.message });
                }
                else {
                    console.log('✅ [BombParty] Stats participant mises à jour:', { matchId, playerId });
                    resolve({ success: true });
                }
            });
        });
    }
    /**
     * Récupère l'historique des parties d'un joueur
     */
    async getPlayerHistory(playerId, limit = 10) {
        return new Promise((resolve) => {
            const query = `
        SELECT 
          m.id as match_id,
          m.room_id,
          m.created_at,
          m.started_at,
          m.ended_at,
          m.winner_id,
          m.total_rounds,
          p.words_submitted,
          p.valid_words,
          p.max_streak,
          p.final_lives,
          p.is_eliminated,
          (p.player_id = m.winner_id) as is_winner
        FROM bp_matches m
        JOIN bp_participants p ON m.id = p.match_id
        WHERE p.player_id = ?
        ORDER BY m.created_at DESC
        LIMIT ?
      `;
            this.db.all(query, [playerId, limit], (err, rows) => {
                if (err) {
                    console.error('❌ [BombParty] Erreur historique joueur:', err);
                    resolve({ success: false, error: err.message });
                }
                else {
                    resolve({ success: true, data: rows || [] });
                }
            });
        });
    }
    /**
     * Récupère les statistiques globales d'un joueur
     */
    async getPlayerStats(playerId) {
        return new Promise((resolve) => {
            const query = `
        SELECT 
          COUNT(*) as total_games,
          SUM(CASE WHEN p.player_id = m.winner_id THEN 1 ELSE 0 END) as total_wins,
          SUM(p.words_submitted) as total_words,
          SUM(p.valid_words) as total_valid_words,
          MAX(p.max_streak) as best_streak
        FROM bp_matches m
        JOIN bp_participants p ON m.id = p.match_id
        WHERE p.player_id = ? AND m.ended_at IS NOT NULL
      `;
            this.db.get(query, [playerId], (err, row) => {
                if (err) {
                    console.error('❌ [BombParty] Erreur stats joueur:', err);
                    resolve({ success: false, error: err.message });
                }
                else if (!row) {
                    resolve({
                        success: true,
                        data: {
                            totalGames: 0,
                            totalWins: 0,
                            totalWords: 0,
                            totalValidWords: 0,
                            bestStreak: 0,
                            winRate: 0
                        }
                    });
                }
                else {
                    const stats = {
                        totalGames: row.total_games || 0,
                        totalWins: row.total_wins || 0,
                        totalWords: row.total_words || 0,
                        totalValidWords: row.total_valid_words || 0,
                        bestStreak: row.best_streak || 0,
                        winRate: row.total_games > 0 ? (row.total_wins / row.total_games) * 100 : 0
                    };
                    resolve({ success: true, data: stats });
                }
            });
        });
    }
    /**
     * Récupère les détails d'une partie
     */
    async getMatchDetails(matchId) {
        return new Promise((resolve) => {
            // D'abord récupérer les détails de la partie
            const matchQuery = `SELECT * FROM bp_matches WHERE id = ?`;
            this.db.get(matchQuery, [matchId], (err, match) => {
                if (err) {
                    resolve({ success: false, error: err.message });
                    return;
                }
                if (!match) {
                    resolve({ success: false, error: 'Match non trouvé' });
                    return;
                }
                // Ensuite récupérer les participants
                const participantsQuery = `SELECT * FROM bp_participants WHERE match_id = ?`;
                this.db.all(participantsQuery, [matchId], (err, participants) => {
                    if (err) {
                        resolve({ success: false, error: err.message });
                    }
                    else {
                        resolve({
                            success: true,
                            data: {
                                match,
                                participants: participants || []
                            }
                        });
                    }
                });
            });
        });
    }
    /**
     * Nettoie les anciennes parties (pour la maintenance)
     */
    async cleanupOldMatches(daysOld = 30) {
        return new Promise((resolve) => {
            const query = `
        DELETE FROM bp_matches 
        WHERE created_at < datetime('now', '-${daysOld} days')
      `;
            this.db.run(query, [], function (err) {
                if (err) {
                    console.error('❌ [BombParty] Erreur nettoyage:', err);
                    resolve({ success: false, error: err.message });
                }
                else {
                    console.log('✅ [BombParty] Nettoyage effectué:', this.changes, 'parties supprimées');
                    resolve({ success: true, data: this.changes });
                }
            });
        });
    }
}
