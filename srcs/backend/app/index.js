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
			display_name TEXT,
			email TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			avatar TEXT,
			wins INTEGER DEFAULT 0,
			losses INTEGER DEFAULT 0,
			online INTEGER DEFAULT 0,
			twoFAEnabled INTEGER DEFAULT 0,
            tournaments_won INTEGER DEFAULT 0,
			preferred_side TEXT DEFAULT 'left',
      		paddle_color TEXT DEFAULT 'White',
      		ball_color TEXT DEFAULT 'Rose'
		);`);

		// ajout colonnes pour legacy DBs (alter table ignore si existe deja)
		db.run(`ALTER TABLE users ADD COLUMN display_name TEXT;`, (err) => {});
		db.run(`ALTER TABLE users ADD COLUMN avatar TEXT;`, (err) => {});
		db.run(`ALTER TABLE users ADD COLUMN wins INTEGER DEFAULT 0;`, (err) => {});
		db.run(`ALTER TABLE users ADD COLUMN losses INTEGER DEFAULT 0;`, (err) => {});
		db.run(`ALTER TABLE users ADD COLUMN online INTEGER DEFAULT 0;`, (err) => {});
		db.run(`ALTER TABLE users ADD COLUMN twoFAEnabled INTEGER DEFAULT 0;`, (err) => {});
        db.run(`ALTER TABLE users ADD COLUMN tournaments_won INTEGER DEFAULT 0;`, (err) => {});

		db.all("PRAGMA table_info('users');", (err, rows) => {
			if (err) {
				console.error('Erreur PRAGMA table_info users:', err);
			} else {
				console.log('users table columns:', rows.map(r => r.name));
			}
		});

        db.run(`CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player1_id INTEGER NOT NULL,
            player2_id INTEGER,
            winner_id INTEGER,
            played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_bot INTEGER DEFAULT 0,
            bot_difficulty TEXT,
            scores TEXT,
            match_type TEXT DEFAULT 'quick',
            FOREIGN KEY (player1_id) REFERENCES users(id),
            FOREIGN KEY (player2_id) REFERENCES users(id),
            FOREIGN KEY (winner_id) REFERENCES users(id)
        );`);
    
        db.run(`CREATE TABLE IF NOT EXISTS friends (
            user_id INTEGER NOT NULL,
            friend_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (friend_id) REFERENCES users(id),
            PRIMARY KEY (user_id, friend_id)
        );`);
    
        db.run(`CREATE TABLE IF NOT EXISTS friend_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id),
            UNIQUE (sender_id, receiver_id)
        );`);

        db.run(`CREATE TABLE IF NOT EXISTS blocked_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            blocker_id INTEGER NOT NULL,
            blocked_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (blocker_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (blocked_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(blocker_id, blocked_id)
        );`);

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

	db.run(`
		CREATE TABLE IF NOT EXISTS bp_user_progress (
			user_id INTEGER PRIMARY KEY,
			level INTEGER DEFAULT 1,
			current_xp INTEGER DEFAULT 0,
			total_xp INTEGER DEFAULT 0,
			badges TEXT DEFAULT '[]',
			unlocked_themes TEXT DEFAULT '["default"]',
			unlocked_avatars TEXT DEFAULT '["default"]',
			current_theme TEXT DEFAULT 'default',
			current_avatar TEXT DEFAULT 'default',
			streak INTEGER DEFAULT 0,
			longest_streak INTEGER DEFAULT 0,
			last_win_streak INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users (id)
		);
	`);

	
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_user_stats_user_id ON bp_user_stats (user_id);`);
	
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_match_history_user_id ON bp_match_history (user_id);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_match_history_match_id ON bp_match_history (match_id);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_match_history_played_at ON bp_match_history (played_at);`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_match_history_user_played ON bp_match_history (user_id, played_at DESC);`);
	
	db.run(`CREATE INDEX IF NOT EXISTS idx_bp_user_progress_user_id ON bp_user_progress (user_id);`);

	console.log("Bomb Party tables and statistics initialized");
});


  fastify.decorate('db', db);

  fastify.get('/db-check', (request, reply) => {
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (err) {
        reply.code(500).send({ status: 'DB error', error: err.message });
      } else {
        reply.send({ status: 'OK', users: row.count });
      }
    });
  });
}

export default fp(dbPlugin);
