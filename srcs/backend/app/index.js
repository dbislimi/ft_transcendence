import fp from 'fastify-plugin';
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
		email TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL
	);`);

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

	// Index pour les performances
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_matches_room_id ON bp_matches (room_id);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_participants_match_id ON bp_participants (match_id);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_participants_player_id ON bp_participants (player_id);`);

	console.log("✅ Tables Bomb Party initialisées");
});

export default db;
