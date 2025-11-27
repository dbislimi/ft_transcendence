import fp from 'fastify-plugin';
import sqlite3Module from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const sqlite3 = sqlite3Module.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data', 'my-database.db');

async function dbPlugin(fastify, opts) {
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      fastify.log.error("❌ Erreur d'ouverture de la base :", err.message);
    } else {
      fastify.log.info("✅ Connecté à la base SQLite");
    }
  });

  	/*db.serialize(() => {
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
			twoFAOtp TEXT,
            tournaments_won INTEGER DEFAULT 0
		);`);

		db.run(`CREATE TABLE IF NOT EXISTS messages (
  			id INTEGER PRIMARY KEY AUTOINCREMENT,
  			fromId INTEGER NOT NULL,
  			toId INTEGER,
  			text TEXT NOT NULL,
			date DATETIME DEFAULT CURRENT_TIMESTAMP,
    		FOREIGN KEY (fromId) REFERENCES users(id),
    		FOREIGN KEY (toId) REFERENCES users(id)
		);`);

		db.run(`CREATE TABLE IF NOT EXISTS blocks (
  			id INTEGER PRIMARY KEY AUTOINCREMENT,
  			blockerId INTEGER NOT NULL,
  			blockedId INTEGER NOT NULL
		);`);


  /*db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
	    twoFAEnabled INTEGER DEFAULT 0,
    	twoFAOtp TEXT
    );`);
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fromId INTEGER,
      toId INTEGER,
      text TEXT NOT null,
      date TEXT NOT null
    );`);
    db.run(`CREATE TABLE IF NOT EXISTS blocks (
      blockerId INTEGER,
      blockedId INTEGER,
      PRIMARY KEY (blockerId, blockedId)
    );`);
  });*/

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
  	  twoFAEnabled INTEGER DEFAULT 0,
    	twoFAOtp TEXT,
      display_name TEXT UNIQUE,
      avatar TEXT DEFAULT '',
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      online INTEGER DEFAULT 0,
      tournaments_won INTEGER DEFAULT 0,
      preferred_side TEXT DEFAULT 'left',
      paddle_color TEXT DEFAULT 'White',
      ball_color TEXT DEFAULT 'Rose'
    );`);
    
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
