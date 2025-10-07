import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import Database from 'sqlite3';

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

// Gestionnaire de salles pour Bomb Party
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.players = new Map();
    }

    createRoom(playerId, name, isPrivate = false, password = null) {
        const roomId = uuidv4();
        const room = {
            id: roomId,
            name: name,
            isPrivate: isPrivate,
            password: password,
            players: new Map(),
            maxPlayers: 6,
            status: 'waiting',
            createdAt: new Date()
        };
        
        this.rooms.set(roomId, room);
        this.joinRoom(playerId, roomId);
        
        return { success: true, roomId: roomId };
    }

    joinRoom(playerId, roomId, password = null) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        if (room.isPrivate && room.password !== password) {
            return { success: false, error: 'Wrong password' };
        }

        if (room.players.size >= room.maxPlayers) {
            return { success: false, error: 'Room is full' };
        }

        const player = this.players.get(playerId);
        if (player) {
            room.players.set(playerId, player);
        }

        return { success: true, room: room };
    }

    leaveRoom(playerId, roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.players.delete(playerId);
            if (room.players.size === 0) {
                this.rooms.delete(roomId);
            }
        }
        return { success: true };
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    registerPlayer(socket, playerId, playerName) {
        this.players.set(playerId, {
            id: playerId,
            name: playerName,
            socket: socket
        });
    }
}

const roomManager = new RoomManager();

// Créer un serveur HTTP
const server = createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5174');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method;

    console.log(`${method} ${path}`);

    // Routes API REST
    if (path === '/' && method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            hello: "Complete Server - API REST + WebSocket",
            rooms: roomManager.rooms.size,
            players: roomManager.players.size
        }));
        return;
    }

    // Route de connexion
    if (path === '/login' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { email, password } = JSON.parse(body);
                
                // Simulation d'une connexion réussie
                const userData = {
                    id: "1",
                    name: email.split('@')[0],
                    email: email,
                    token: uuidv4()
                };
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, user: userData }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
        return;
    }

    // Route d'inscription
    if (path === '/register' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { name, email, password } = JSON.parse(body);
                
                // Simulation d'une inscription réussie
                const userData = {
                    id: uuidv4(),
                    name: name,
                    email: email,
                    token: uuidv4()
                };
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, user: userData }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
        return;
    }

    // Route de profil
    if (path === '/profile' && method === 'GET') {
        const userData = {
            id: "1",
            name: "TestUser",
            email: "test@example.com"
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(userData));
        return;
    }

    // Route par défaut
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Not found" }));
});

// Créer le serveur WebSocket pour Bomb Party
const wss = new WebSocketServer({ 
    server,
    path: '/bombparty/ws'
});

// Validation simple
function validatePlayerName(name) {
    if (!name || typeof name !== 'string') {
        return { success: false, error: 'Name is required' };
    }
    if (name.length < 1 || name.length > 50) {
        return { success: false, error: 'Name must be 1-50 characters' };
    }
    return { success: true, data: name.trim() };
}

wss.on('connection', (ws, req) => {
    console.log('🔌 [BombParty] Nouvelle connexion WebSocket');
    
    const session = {
        authenticated: false,
        playerId: null,
        playerName: null
    };

    function sendError(error, code = 'UNKNOWN_ERROR') {
        const message = {
            event: 'bp:lobby:error',
            payload: { error, code }
        };
        ws.send(JSON.stringify(message));
    }

    function sendMessage(message) {
        ws.send(JSON.stringify(message));
    }

    function requireAuth() {
        if (!session.authenticated) {
            sendError('Authentication required', 'AUTH_REQUIRED');
            return false;
        }
        return true;
    }

    // Gestion des messages
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('📨 [BombParty] Message reçu:', message);

            switch (message.event) {
                case 'bp:auth':
                    handleAuth(message.payload);
                    break;
                
                case 'bp:lobby:create':
                    if (requireAuth()) {
                        handleLobbyCreate(message.payload);
                    }
                    break;
                
                case 'bp:lobby:join':
                    if (requireAuth()) {
                        handleLobbyJoin(message.payload);
                    }
                    break;
                
                case 'bp:lobby:leave':
                    if (requireAuth()) {
                        handleLobbyLeave(message.payload);
                    }
                    break;
                
                case 'bp:lobby:list':
                    if (requireAuth()) {
                        handleLobbyList();
                    }
                    break;
                
                default:
                    sendError(`Event non supporté: ${message.event}`, 'UNSUPPORTED_EVENT');
            }
        } catch (error) {
            console.error('❌ [BombParty] Erreur parsing message:', error);
            sendError('Invalid message format', 'INVALID_MESSAGE');
        }
    });

    function handleAuth(payload) {
        const nameResult = validatePlayerName(payload.playerName);
        if (!nameResult.success) {
            sendError(nameResult.error, 'INVALID_NAME');
            return;
        }

        session.playerId = uuidv4();
        session.playerName = nameResult.data;
        session.authenticated = true;

        roomManager.registerPlayer(ws, session.playerId, session.playerName);

        console.log('✅ [BombParty] Joueur authentifié:', {
            id: session.playerId,
            name: session.playerName
        });

        sendMessage({
            event: 'bp:auth:success',
            payload: {
                playerId: session.playerId,
                playerName: session.playerName
            }
        });
    }

    function handleLobbyCreate(payload) {
        const result = roomManager.createRoom(
            session.playerId,
            payload.name,
            payload.isPrivate || false,
            payload.password || null
        );

        if (result.success) {
            sendMessage({
                event: 'bp:lobby:created',
                payload: {
                    roomId: result.roomId,
                    playerId: session.playerId
                }
            });
        } else {
            sendError(result.error, 'CREATE_FAILED');
        }
    }

    function handleLobbyJoin(payload) {
        const result = roomManager.joinRoom(
            session.playerId,
            payload.roomId,
            payload.password || null
        );

        if (result.success) {
            const room = result.room;
            const players = Array.from(room.players.values()).map(p => ({
                id: p.id,
                name: p.name
            }));

            sendMessage({
                event: 'bp:lobby:joined',
                payload: {
                    roomId: room.id,
                    playerId: session.playerId,
                    players: players
                }
            });

            // Notifier les autres joueurs
            room.players.forEach((player, playerId) => {
                if (playerId !== session.playerId && player.socket) {
                    player.socket.send(JSON.stringify({
                        event: 'bp:lobby:player_joined',
                        payload: {
                            roomId: room.id,
                            player: {
                                id: session.playerId,
                                name: session.playerName
                            }
                        }
                    }));
                }
            });
        } else {
            sendError(result.error, 'JOIN_FAILED');
        }
    }

    function handleLobbyLeave(payload) {
        const result = roomManager.leaveRoom(session.playerId, payload.roomId);
        if (result.success) {
            sendMessage({
                event: 'bp:lobby:left',
                payload: {
                    roomId: payload.roomId,
                    playerId: session.playerId
                }
            });
        }
    }

    function handleLobbyList() {
        const rooms = Array.from(roomManager.rooms.values())
            .filter(room => !room.isPrivate)
            .map(room => ({
                id: room.id,
                name: room.name,
                playerCount: room.players.size,
                maxPlayers: room.maxPlayers,
                status: room.status
            }));

        sendMessage({
            event: 'bp:lobby:list',
            payload: { rooms }
        });
    }

    ws.on('close', () => {
        console.log('🔌 [BombParty] Connexion WebSocket fermée');
        if (session.playerId) {
            // Retirer le joueur de toutes les salles
            roomManager.rooms.forEach((room, roomId) => {
                if (room.players.has(session.playerId)) {
                    room.players.delete(session.playerId);
                    if (room.players.size === 0) {
                        roomManager.rooms.delete(roomId);
                    }
                }
            });
            roomManager.players.delete(session.playerId);
        }
    });

    ws.on('error', (error) => {
        console.error('❌ [BombParty] Erreur WebSocket:', error);
    });
});

// Démarrer le serveur
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur complet démarré sur http://localhost:${PORT}`);
    console.log(`🔌 WebSocket Bomb Party sur ws://localhost:${PORT}/bombparty/ws`);
    console.log(`📡 API REST disponible sur http://localhost:${PORT}`);
});
