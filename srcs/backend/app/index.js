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

	// ajout colonnes pour legacy DBs (alter table ignore si existe deja)
	db.run(`ALTER TABLE users ADD COLUMN display_name TEXT;`, (err) => {});
	db.run(`ALTER TABLE users ADD COLUMN avatar TEXT;`, (err) => {});
	db.run(`ALTER TABLE users ADD COLUMN wins INTEGER DEFAULT 0;`, (err) => {});
	db.run(`ALTER TABLE users ADD COLUMN losses INTEGER DEFAULT 0;`, (err) => {});
	db.run(`ALTER TABLE users ADD COLUMN online INTEGER DEFAULT 0;`, (err) => {});
	db.run(`ALTER TABLE users ADD COLUMN twoFAEnabled INTEGER DEFAULT 0;`, (err) => {});

	db.all("PRAGMA table_info('users');", (err, rows) => {
		if (err) {
			console.error('Erreur PRAGMA table_info users:', err);
		} else {
			console.log('users table columns:', rows.map(r => r.name));
		}
	});

	db.run(`
		CREATE TABLE IF NOT EXISTS bp_user_stats (
			user_id INTEGER PRIMARY KEY,
			total_matches INTEGER DEFAULT 0,
			total_wins INTEGER DEFAULT 0,
			total_words_submitted INTEGER DEFAULT 0,
			total_valid_words INTEGER DEFAULT 0,
			best_streak INTEGER DEFAULT 0,
			average_response_time REAL DEFAULT 0,
			total_play_time INTEGER DEFAULT 0,
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
			position INTEGER,
			words_submitted INTEGER DEFAULT 0,
			valid_words INTEGER DEFAULT 0,
			final_lives INTEGER DEFAULT 0,
			match_duration INTEGER DEFAULT 0,
			played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users (id)
		);
	`);

	
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_user_stats_user_id ON bp_user_stats (user_id);`);
	
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_match_history_user_id ON bp_match_history (user_id);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_match_history_match_id ON bp_match_history (match_id);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_match_history_played_at ON bp_match_history (played_at);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_match_history_user_played ON bp_match_history (user_id, played_at DESC);`);

	console.log("Bomb Party tables and statistics initialized");
});

export default db;
