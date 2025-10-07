import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import Database from 'sqlite3";

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

// Créer un serveur HTTP
const server = createServer((req, res) => {
    // Route de test
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ hello: "from websocket server" }));
        return;
    }
    
    // Route pour les autres requêtes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Not found" }));
});

// Créer le serveur WebSocket
const wss = new WebSocketServer({ 
    server,
    path: '/bombparty/ws'
});

wss.on('connection', (ws, req) => {
    console.log('🔌 [BombParty] Nouvelle connexion WebSocket');
    
    // Envoyer un message de bienvenue
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connexion WebSocket établie avec succès!'
    }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 [BombParty] Message reçu:', data);
            
            // Répondre avec un message de test
            ws.send(JSON.stringify({
                type: 'test',
                message: 'Message reçu et traité!',
                originalData: data
            }));
        } catch (error) {
            console.error('❌ [BombParty] Erreur parsing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Erreur lors du parsing du message'
            }));
        }
    });

    ws.on('close', () => {
        console.log('🔌 [BombParty] Connexion WebSocket fermée');
    });

    ws.on('error', (error) => {
        console.error('❌ [BombParty] Erreur WebSocket:', error);
    });
});

// Démarrer le serveur
const PORT = 3002;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur WebSocket démarré sur http://localhost:${PORT}`);
    console.log(`🔌 WebSocket disponible sur ws://localhost:${PORT}/bombparty/ws`);
});
