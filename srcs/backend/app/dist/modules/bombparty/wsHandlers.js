/**
 * Handlers WebSocket pour Bomb Party
 *
 * Gère les connexions WebSocket et les messages des clients
 * Intègre avec RoomManager pour la logique métier
 */
import { BombPartyRoomManager } from './RoomManager.ts';
import { BombPartyWSServer } from './wsServer.ts';
import { validateClientMessage, validatePlayerName, validateAuthMessage } from './validation.ts';
import { ErrorCode } from './types.ts';
import { v4 as uuidv4 } from 'uuid';
/**
 * Plugin Fastify pour les WebSocket Bomb Party
 */
export default async function bombPartyWSHandlers(fastify) {
    const roomManager = new BombPartyRoomManager();
    const wsServer = new BombPartyWSServer();
    // Route WebSocket pour Bomb Party
    fastify.get('/bombparty/ws', { websocket: true }, (socket, request) => {
        const session = {
            authenticated: false
        };
        wsServer.registerConnection(socket);
        /**
         * Envoie un message d'erreur typé au client
         */
        function sendError(error, code = ErrorCode.STATE_ERROR) {
            wsServer.sendError(socket, error, code);
        }
        /**
         * Envoie un message de succès au client
         */
        function sendMessage(message) {
            wsServer.sendMessage(socket, message);
        }
        /**
         * Authentifie un joueur (version simplifiée)
         */
        function authenticatePlayer(playerName) {
            const nameResult = validatePlayerName(playerName);
            if (!nameResult.success) {
                sendError(nameResult.error || 'Nom invalide', nameResult.code || ErrorCode.VALIDATION_ERROR);
                return false;
            }
            session.playerId = uuidv4();
            session.playerName = nameResult.data;
            session.authenticated = true;
            roomManager.registerPlayer(socket, session.playerId, session.playerName);
            wsServer.updateConnection(socket, session.playerId);
            return true;
        }
        /**
         * Vérifie l'authentification
         */
        function requireAuth() {
            if (!session.authenticated || !session.playerId) {
                sendError('Authentification requise', ErrorCode.AUTH_ERROR);
                return false;
            }
            return true;
        }
        socket.on('message', (data) => {
            try {
                const rawMessage = JSON.parse(data.toString());
                if (rawMessage.event === 'bp:auth') {
                    const validation = validateAuthMessage(rawMessage);
                    if (!validation.success) {
                        sendError(validation.error || 'Message d\'authentification invalide', validation.code || ErrorCode.VALIDATION_ERROR);
                        return;
                    }
                    if (authenticatePlayer(validation.data.payload.playerName)) {
                        sendMessage({
                            event: 'bp:auth:success',
                            payload: {
                                playerId: session.playerId,
                                playerName: session.playerName
                            }
                        });
                    }
                    return;
                }
                if (!requireAuth())
                    return;
                const validation = validateClientMessage(rawMessage);
                if (!validation.success) {
                    sendError(validation.error || 'Message invalide', validation.code || ErrorCode.VALIDATION_ERROR);
                    return;
                }
                const message = validation.data;
                const playerId = session.playerId;
                switch (message.event) {
                    case 'bp:lobby:create':
                        handleLobbyCreate(playerId, message.payload);
                        break;
                    case 'bp:lobby:join':
                        handleLobbyJoin(playerId, message.payload);
                        break;
                    case 'bp:lobby:leave':
                        handleLobbyLeave(playerId, message.payload);
                        break;
                    case 'bp:lobby:start':
                        handleLobbyStart(playerId, message.payload);
                        break;
                    case 'bp:lobby:list':
                        handleLobbyList(playerId, message.payload);
                        break;
                    case 'bp:lobby:details':
                        handleLobbyDetails(playerId, message.payload);
                        break;
                    case 'bp:game:input':
                        handleGameInput(playerId, message.payload);
                        break;
                    case 'bp:bonus:activate':
                        handleBonusActivate(playerId, message.payload);
                        break;
                    default:
                        sendError(`Event non supporté: ${message.event}`, ErrorCode.VALIDATION_ERROR);
                }
            }
            catch (error) {
                console.error('[BombParty] Erreur traitement message:', error);
                sendError('Erreur traitement message', ErrorCode.STATE_ERROR);
            }
        });
        /**
         * Gère la création d'un lobby
         */
        function handleLobbyCreate(playerId, payload) {
            const result = roomManager.createRoom(playerId, payload.name, payload.isPrivate, payload.password, payload.maxPlayers);
            if (result.success) {
                session.roomId = result.roomId;
                wsServer.updateConnection(socket, session.playerId, result.roomId);
                sendMessage({
                    event: 'bp:lobby:created',
                    payload: {
                        roomId: result.roomId,
                        playerId,
                        maxPlayers: result.maxPlayers
                    }
                });
            }
            else {
                sendError(result.error || 'Erreur création lobby', ErrorCode.STATE_ERROR);
            }
        }
        /**
         * Gère la connexion à un lobby
         */
        function handleLobbyJoin(playerId, payload) {
            const result = roomManager.joinRoom(playerId, payload.roomId, payload.password);
            if (result.success) {
                session.roomId = payload.roomId;
                wsServer.updateConnection(socket, session.playerId, payload.roomId);
                sendMessage({
                    event: 'bp:lobby:joined',
                    payload: {
                        roomId: payload.roomId,
                        playerId,
                        players: result.players || [],
                        maxPlayers: result.maxPlayers
                    }
                });
            }
            else {
                let code = ErrorCode.STATE_ERROR;
                if (result.error?.includes('non trouvée'))
                    code = ErrorCode.STATE_ERROR;
                else if (result.error?.includes('pleine'))
                    code = ErrorCode.STATE_ERROR;
                else if (result.error?.includes('mot de passe'))
                    code = ErrorCode.AUTH_ERROR;
                else if (result.error?.includes('déjà dans'))
                    code = ErrorCode.STATE_ERROR;
                sendError(result.error || 'Erreur rejoindre lobby', code);
            }
        }
        /**
         * Gère la sortie d'un lobby
         */
        function handleLobbyLeave(playerId, payload) {
            const result = roomManager.leaveRoom(playerId, payload.roomId);
            if (result.success) {
                session.roomId = undefined;
                wsServer.updateConnection(socket, session.playerId);
                sendMessage({
                    event: 'bp:lobby:left',
                    payload: {
                        roomId: payload.roomId,
                        playerId
                    }
                });
            }
            else {
                sendError(result.error || 'Erreur sortie lobby', ErrorCode.STATE_ERROR);
            }
        }
        /**
         * Gère la demande de liste des lobbies publics
         */
        function handleLobbyList(playerId, payload) {
            const publicRooms = roomManager.getPublicRooms();
            sendMessage({
                event: 'bp:lobby:list',
                payload: {
                    rooms: publicRooms
                }
            });
        }
        /**
         * Gère la demande de détails d'un lobby
         */
        function handleLobbyDetails(playerId, payload) {
            const result = roomManager.getRoomDetails(payload.roomId);
            if (result.success) {
                sendMessage({
                    event: 'bp:lobby:details',
                    payload: {
                        room: result.room
                    }
                });
            }
            else {
                sendError(result.error || 'Lobby non trouvé', ErrorCode.STATE_ERROR);
            }
        }
        /**
         * Gère le démarrage d'une partie
         */
        function handleLobbyStart(playerId, payload) {
            const result = roomManager.startGame(playerId, payload.roomId);
            if (!result.success) {
                sendError(result.error || 'Erreur démarrage partie', ErrorCode.STATE_ERROR);
            }
        }
        /**
         * Gère l'entrée d'un mot dans le jeu
         */
        function handleGameInput(playerId, payload) {
            const result = roomManager.handleGameInput(playerId, payload.roomId, payload.word, payload.msTaken);
            if (!result.success) {
                sendError(result.error || 'Erreur entrée jeu', ErrorCode.STATE_ERROR);
            }
        }
        /**
         * Gère l'activation d'un bonus
         */
        function handleBonusActivate(playerId, payload) {
            const result = roomManager.activateBonus(playerId, payload.roomId, payload.bonusKey);
            if (!result.success) {
                sendError(result.error || 'Erreur activation bonus', ErrorCode.STATE_ERROR);
            }
        }
        socket.on('close', (code, reason) => {
            if (session.playerId && session.roomId) {
                roomManager.leaveRoom(session.playerId, session.roomId);
            }
        });
        socket.on('error', (error) => {
            console.error('[BombParty] Erreur WebSocket:', error);
        });
        sendMessage({
            event: 'bp:welcome',
            payload: {
                message: 'Connexion Bomb Party établie',
                version: '1.0.0'
            }
        });
    });
}
/**
 * Utilitaires pour les tests et le debug
 */
export class BombPartyWSManager {
    static instance = null;
    /**
     * Obtient l'instance du RoomManager (pour les tests)
     */
    static getRoomManager() {
        return this.instance;
    }
    /**
     * Définit l'instance du RoomManager (pour les tests)
     */
    static setRoomManager(manager) {
        this.instance = manager;
    }
}
