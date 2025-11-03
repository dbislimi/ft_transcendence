import sqlite3Module from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const sqlite3 = sqlite3Module.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data', 'my-database.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
	if (err) {
		console.error("Erreur d'ouverture de la base :", err.message);
	} else {
		console.log("Connected to SQLite database");
	}
});

db.serialize(() => {
	db.run(`CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		display_name TEXT,
		email TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL,
		avatar TEXT,
		wins INTEGER DEFAULT 0,
		losses INTEGER DEFAULT 0,
		online INTEGER DEFAULT 0,
		twoFAEnabled INTEGER DEFAULT 0
	);`);

	// Ensure legacy databases get new columns (ALTER TABLE will fail if column exists, so ignore errors)
	db.run(`ALTER TABLE users ADD COLUMN display_name TEXT;`, (err) => {});
	db.run(`ALTER TABLE users ADD COLUMN avatar TEXT;`, (err) => {});
	// add wins/losses columns if missing (legacy DBs)
	db.run(`ALTER TABLE users ADD COLUMN wins INTEGER DEFAULT 0;`, (err) => {});
	db.run(`ALTER TABLE users ADD COLUMN losses INTEGER DEFAULT 0;`, (err) => {});
	db.run(`ALTER TABLE users ADD COLUMN online INTEGER DEFAULT 0;`, (err) => {});
	db.run(`ALTER TABLE users ADD COLUMN twoFAEnabled INTEGER DEFAULT 0;`, (err) => {});

	// Debug: show current users table columns
	db.all("PRAGMA table_info('users');", (err, rows) => {
		if (err) {
			console.error('Erreur PRAGMA table_info users:', err);
		} else {
			console.log('users table columns:', rows.map(r => r.name));
		}
	});

	// Tables Bomb Party
	db.run(`
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

	db.run(`
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

	// Tables de statistiques
	db.run(`
		CREATE TABLE IF NOT EXISTS bp_user_stats (
			user_id INTEGER PRIMARY KEY,
			total_matches INTEGER DEFAULT 0,
			total_wins INTEGER DEFAULT 0,
			total_words_submitted INTEGER DEFAULT 0,
			total_valid_words INTEGER DEFAULT 0,
			best_streak INTEGER DEFAULT 0,
			average_response_time REAL DEFAULT 0,
			favorite_trigram TEXT,
			total_play_time INTEGER DEFAULT 0, -- en secondes
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users (id)
		);
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS bp_match_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			match_id INTEGER NOT NULL,
			position INTEGER, -- 1er, 2ème, etc.
			words_submitted INTEGER DEFAULT 0,
			valid_words INTEGER DEFAULT 0,
			final_lives INTEGER DEFAULT 0,
			match_duration INTEGER DEFAULT 0, -- en secondes
			played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users (id),
			FOREIGN KEY (match_id) REFERENCES bp_matches (id)
		);
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS bp_trigram_stats (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			trigram TEXT NOT NULL,
			times_used INTEGER DEFAULT 0,
			success_rate REAL DEFAULT 0,
			average_time REAL DEFAULT 0,
			last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users (id)
		);
	`);

	// Index pour les performances
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_matches_room_id ON bp_matches (room_id);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_participants_match_id ON bp_participants (match_id);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_participants_player_id ON bp_participants (player_id);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_user_stats_user_id ON bp_user_stats (user_id);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_match_history_user_id ON bp_match_history (user_id);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_match_history_played_at ON bp_match_history (played_at);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_trigram_stats_user_id ON bp_trigram_stats (user_id);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_trigram_stats_trigram ON bp_trigram_stats (trigram);`);

	console.log("Bomb Party tables and statistics initialized");
});

export default db;
