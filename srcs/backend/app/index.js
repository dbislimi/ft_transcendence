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

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
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
