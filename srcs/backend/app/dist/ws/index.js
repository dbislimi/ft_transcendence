import { BombPartyRoomManager } from '../modules/bombparty/RoomManager';
import { allClientMessageSchemas, errorResponseSchema, pingSchema } from '../modules/bombparty/schemas';
export default async function wsServer(fastify) {
    const roomManager = new BombPartyRoomManager();
    fastify.get('/bombparty/ws', { websocket: true }, (socket, request) => {
        const session = {
            authenticated: false,
            lastPong: Date.now()
        };
        function sendError(error, code = 'STATE_ERROR') {
            const errorMessage = errorResponseSchema.parse({
                event: 'bp:error',
                payload: { code, msg: error }
            });
            socket.send(JSON.stringify(errorMessage));
        }
        function sendMessage(message) {
            socket.send(JSON.stringify(message));
        }
        function startHeartbeat() {
            session.heartbeatInterval = setInterval(() => {
                const now = Date.now();
                if (now - session.lastPong > 10000) {
                    console.log('[WS] Heartbeat timeout, closing connection');
                    socket.close(1000, 'Heartbeat timeout');
                    return;
                }
                const pingMessage = pingSchema.parse({
                    event: 'bp:ping',
                    payload: { timestamp: now }
                });
                sendMessage(pingMessage);
            }, 15000);
        }
        function stopHeartbeat() {
            if (session.heartbeatInterval) {
                clearInterval(session.heartbeatInterval);
                session.heartbeatInterval = undefined;
            }
        }
        function authenticatePlayer(playerName) {
            if (session.authenticated) {
                sendError('Already authenticated', 'STATE_ERROR');
                return false;
            }
            if (!playerName || playerName.length < 1 || playerName.length > 50) {
                sendError('Invalid player name', 'VALIDATION_ERROR');
                return false;
            }
            session.playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            session.playerName = playerName;
            session.authenticated = true;
            roomManager.registerPlayer(socket, session.playerId, session.playerName);
            startHeartbeat();
            return true;
        }
        function requireAuth() {
            if (!session.authenticated || !session.playerId) {
                sendError('Authentication required', 'AUTH_ERROR');
                return false;
            }
            return true;
        }
        socket.on('message', (data) => {
            try {
                const rawMessage = JSON.parse(data.toString());
                const validation = allClientMessageSchemas.safeParse(rawMessage);
                if (!validation.success) {
                    sendError('Invalid message format', 'VALIDATION_ERROR');
                    return;
                }
                const message = validation.data;
                const playerId = session.playerId;
                switch (message.event) {
                    case 'bp:auth':
                        if (authenticatePlayer(message.payload.playerName)) {
                            sendMessage({
                                event: 'bp:auth:success',
                                payload: { playerId: session.playerId }
                            });
                        }
                        break;
                    case 'bp:pong':
                        session.lastPong = Date.now();
                        break;
                    case 'bp:lobby:create':
                        if (!requireAuth())
                            return;
                        handleLobbyCreate(playerId, message.payload);
                        break;
                    case 'bp:lobby:join':
                        if (!requireAuth())
                            return;
                        handleLobbyJoin(playerId, message.payload);
                        break;
                    case 'bp:lobby:leave':
                        if (!requireAuth())
                            return;
                        handleLobbyLeave(playerId, message.payload);
                        break;
                    case 'bp:lobby:list':
                        if (!requireAuth())
                            return;
                        handleLobbyList(playerId, message.payload);
                        break;
                    case 'bp:lobby:start':
                        if (!requireAuth())
                            return;
                        handleLobbyStart(playerId, message.payload);
                        break;
                    case 'bp:game:input':
                        if (!requireAuth())
                            return;
                        handleGameInput(playerId, message.payload);
                        break;
                    case 'bp:bonus:activate':
                        if (!requireAuth())
                            return;
                        handleBonusActivate(playerId, message.payload);
                        break;
                    default:
                        sendError(`Unsupported event: ${message.event}`, 'VALIDATION_ERROR');
                }
            }
            catch (error) {
                console.error('[WS] Message processing error:', error);
                sendError('Message processing error', 'STATE_ERROR');
            }
        });
        function handleLobbyCreate(playerId, payload) {
            const result = roomManager.createRoom(playerId, payload.name, payload.isPrivate || false, payload.password, payload.maxPlayers || 4);
            if (result.success) {
                session.roomId = result.roomId;
                sendMessage({
                    event: 'bp:lobby:created',
                    payload: { roomId: result.roomId }
                });
            }
            else {
                sendError(result.error || 'Failed to create lobby', 'STATE_ERROR');
            }
        }
        function handleLobbyJoin(playerId, payload) {
            const result = roomManager.joinRoom(playerId, payload.roomId, payload.password);
            if (result.success) {
                session.roomId = payload.roomId;
                const room = roomManager.getRoomInfo(payload.roomId);
                if (room) {
                    sendMessage({
                        event: 'bp:lobby:joined',
                        payload: {
                            roomId: payload.roomId,
                            snapshot: {
                                id: room.id,
                                name: room.name,
                                isPrivate: room.isPrivate,
                                players: Array.from(room.players.values()).map(p => ({
                                    id: p.id,
                                    name: p.name
                                })),
                                maxPlayers: room.maxPlayers,
                                isStarted: roomManager.getRoomEngines().has(payload.roomId),
                                createdAt: room.createdAt
                            }
                        }
                    });
                }
            }
            else {
                sendError(result.error || 'Failed to join lobby', 'STATE_ERROR');
            }
        }
        function handleLobbyLeave(playerId, payload) {
            const result = roomManager.leaveRoom(playerId, payload.roomId);
            if (result.success) {
                session.roomId = undefined;
                sendMessage({
                    event: 'bp:lobby:left',
                    payload: { roomId: payload.roomId }
                });
            }
            else {
                sendError(result.error || 'Failed to leave lobby', 'STATE_ERROR');
            }
        }
        function handleLobbyList(playerId, payload) {
            const rooms = roomManager.getPublicRooms();
            const filteredRooms = payload.filter?.openOnly
                ? rooms.filter(room => !room.isStarted)
                : rooms;
            sendMessage({
                event: 'bp:lobby:list:result',
                payload: { rooms: filteredRooms }
            });
        }
        function handleLobbyStart(playerId, payload) {
            const result = roomManager.startGame(playerId, payload.roomId);
            if (result.success) {
                sendMessage({
                    event: 'bp:lobby:started',
                    payload: { roomId: payload.roomId }
                });
            }
            else {
                sendError(result.error || 'Failed to start game', 'STATE_ERROR');
            }
        }
        function handleGameInput(playerId, payload) {
            const result = roomManager.handleGameInput(playerId, payload.roomId, payload.word, payload.msTaken);
            if (!result.success) {
                sendError(result.error || 'Failed to process game input', 'STATE_ERROR');
            }
        }
        function handleBonusActivate(playerId, payload) {
            const result = roomManager.activateBonus(playerId, payload.roomId, payload.bonusKey);
            if (!result.success) {
                sendError(result.error || 'Failed to activate bonus', 'STATE_ERROR');
            }
        }
        socket.on('close', () => {
            console.log('[WS] Connection closed');
            stopHeartbeat();
            if (session.playerId) {
                roomManager.handlePlayerDisconnect(session.playerId);
            }
        });
        socket.on('error', (error) => {
            console.error('[WS] Connection error:', error);
            stopHeartbeat();
        });
    });
}
