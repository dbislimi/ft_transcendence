import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

// Gestionnaire de salles simple
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
            status: 'waiting', // waiting, playing, finished
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

// Créer un serveur HTTP
const server = createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Route de test
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            hello: "Bomb Party WebSocket Server",
            rooms: roomManager.rooms.size,
            players: roomManager.players.size
        }));
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

const roomManager = new RoomManager();

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
const PORT = 3002;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur Bomb Party WebSocket démarré sur http://localhost:${PORT}`);
    console.log(`🔌 WebSocket disponible sur ws://localhost:${PORT}/bombparty/ws`);
});
