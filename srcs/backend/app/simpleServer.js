import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
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

const fastify = Fastify({
    logger: {
        transport: {
            target: "pino-pretty",
        },
    },
});

fastify.register(websocket);
fastify.register(cors, {
    origin: "http://localhost:5173", // ton app React
});

// Route de test
fastify.get("/", async () => {
    return { hello: "from server" };
});

// WebSocket pour Bomb Party
fastify.register(async function (fastify) {
    fastify.get('/bombparty/ws', { websocket: true }, (connection, req) => {
        console.log('🔌 [BombParty] Nouvelle connexion WebSocket');
        
        // Vérifier que connection.socket existe
        if (!connection.socket) {
            console.error('❌ [BombParty] connection.socket est undefined');
            return;
        }
        
        const socket = connection.socket;
        
        socket.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log('📨 [BombParty] Message reçu:', data);
                
                // Répondre avec un message de test
                socket.send(JSON.stringify({
                    type: 'test',
                    message: 'Connexion WebSocket établie!'
                }));
            } catch (error) {
                console.error('❌ [BombParty] Erreur parsing message:', error);
            }
        });

        socket.on('close', () => {
            console.log('🔌 [BombParty] Connexion WebSocket fermée');
        });

        socket.on('error', (error) => {
            console.error('❌ [BombParty] Erreur WebSocket:', error);
        });
        
        // Envoyer un message de bienvenue immédiatement
        socket.send(JSON.stringify({
            type: 'welcome',
            message: 'Connexion WebSocket établie avec succès!'
        }));
    });
});

// WebSocket pour le jeu Pong
fastify.register(async function (fastify) {
    fastify.get('/game/ws', { websocket: true }, (connection, req) => {
        console.log('🎮 [Pong] Nouvelle connexion WebSocket');
        
        // Utiliser connection directement au lieu de connection.socket
        const socket = connection;
        console.log('🔍 [Pong] Connection object:', typeof socket, socket ? 'exists' : 'null');
        
        if (!socket) {
            console.error('❌ [Pong] connection est undefined');
            return;
        }
        
        // État du jeu simulé
        let gameState = {
            ball: { radius: 100/70, x: 100, y: 50, speed: 0 },
            players: {
                p1: { size: 25, y: 37.5, score: 0 },
                p2: { size: 25, y: 37.5, score: 0 }
            },
            bonus: { count: 0, bonuses: [] }
        };
        
        let gameRunning = false;
        let ballDirection = { x: 1, y: 1 };
        
        // Simulation de mouvement de balle
        const gameLoop = setInterval(() => {
            if (!gameRunning) return;
            
            // Mouvement de la balle
            gameState.ball.x += ballDirection.x * 2;
            gameState.ball.y += ballDirection.y * 2;
            
            // Collision avec les murs
            if (gameState.ball.y <= 0 || gameState.ball.y >= 100) {
                ballDirection.y *= -1;
            }
            
            // Collision avec les joueurs
            if (gameState.ball.x <= 5 && 
                gameState.ball.y >= gameState.players.p1.y && 
                gameState.ball.y <= gameState.players.p1.y + gameState.players.p1.size) {
                ballDirection.x *= -1;
                gameState.ball.speed += 0.5;
            }
            
            if (gameState.ball.x >= 195 && 
                gameState.ball.y >= gameState.players.p2.y && 
                gameState.ball.y <= gameState.players.p2.y + gameState.players.p2.size) {
                ballDirection.x *= -1;
                gameState.ball.speed += 0.5;
            }
            
            // Reset si la balle sort
            if (gameState.ball.x < 0) {
                gameState.players.p2.score++;
                gameState.ball.x = 100;
                gameState.ball.y = 50;
                gameState.ball.speed = 0;
                ballDirection.x = 1;
            }
            if (gameState.ball.x > 200) {
                gameState.players.p1.score++;
                gameState.ball.x = 100;
                gameState.ball.y = 50;
                gameState.ball.speed = 0;
                ballDirection.x = -1;
            }
            
            // Envoyer l'état mis à jour
            socket.send(JSON.stringify({
                event: 'data',
                body: gameState
            }));
        }, 50); // 20 FPS
        
        socket.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log('📨 [Pong] Message reçu:', data);
                
                if (data.event === 'start') {
                    console.log('🎮 [Pong] Démarrage du jeu');
                    gameRunning = true;
                    gameState.ball.speed = 2;
                    gameState.ball.x = 100;
                    gameState.ball.y = 50;
                    ballDirection = { x: 1, y: 1 };
                    
                    // Envoyer l'état initial
                    socket.send(JSON.stringify({
                        event: 'data',
                        body: gameState
                    }));
                } else if (data.event === 'stop') {
                    console.log('🎮 [Pong] Arrêt du jeu');
                    gameRunning = false;
                } else if (data.event === 'play') {
                    // Gérer les mouvements des joueurs
                    const { type, dir, id } = data.body;
                    if (type === 'press') {
                        if (id === 0) { // Joueur 1
                            if (dir === 'up') gameState.players.p1.y = Math.max(0, gameState.players.p1.y - 5);
                            if (dir === 'down') gameState.players.p1.y = Math.min(75, gameState.players.p1.y + 5);
                        } else if (id === 1) { // Joueur 2
                            if (dir === 'up') gameState.players.p2.y = Math.max(0, gameState.players.p2.y - 5);
                            if (dir === 'down') gameState.players.p2.y = Math.min(75, gameState.players.p2.y + 5);
                        }
                    }
                    
                    // Envoyer l'état mis à jour
                    socket.send(JSON.stringify({
                        event: 'data',
                        body: gameState
                    }));
                }
            } catch (error) {
                console.error('❌ [Pong] Erreur parsing message:', error);
            }
        });

        socket.on('close', () => {
            console.log('🔌 [Pong] Connexion WebSocket fermée');
            clearInterval(gameLoop);
        });

        socket.on('error', (error) => {
            console.error('❌ [Pong] Erreur WebSocket:', error);
        });
        
        // Envoyer un message de bienvenue
        socket.send(JSON.stringify({
            event: 'connected',
            message: 'Connexion Pong établie!'
        }));
    });
});

// Lancement du serveur
const start = async () => {
    try {
        await fastify.listen({ port: 3001, host: "0.0.0.0" });
        console.log("🚀 Serveur démarré sur http://localhost:3001");
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();