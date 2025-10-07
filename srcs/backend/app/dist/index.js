import Database from "sqlite3";
// Création de la base de données SQLite
const db = new Database.Database("./data/my-database.db");
// Initialisation des tables
db.serialize(() => {
    // Table des utilisateurs
    db.run(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			email TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			twoFAEnabled BOOLEAN DEFAULT 0,
			twoFASecret TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`);
    // Table des sessions
    db.run(`
		CREATE TABLE IF NOT EXISTS sessions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			token TEXT UNIQUE NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			expires_at DATETIME NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users (id)
		)
	`);
    console.log("📊 Base de données initialisée");
});
export default db;
