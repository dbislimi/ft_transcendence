/**
 * Handlers WebSocket pour Bomb Party
 *
 * Gère les connexions WebSocket et les messages des clients
 * Intègre avec RoomManager pour la logique métier
 */
import { BombPartyRoomManager } from './RoomManager.ts';
import { validateClientMessage, validatePlayerName,
// ValidationResult importé depuis GameEngine 
 } from './validation.ts';
import { v4 as uuidv4 } from 'uuid';
/**
 * Plugin Fastify pour les WebSocket Bomb Party
 */
export default async function bombPartyWSHandlers(fastify) {
    const roomManager = new BombPartyRoomManager();
    // Route WebSocket pour Bomb Party
    fastify.get('/bombparty/ws', { websocket: true }, (socket, request) => {
        const session = {
            authenticated: false
        };
        console.log('🔌 [BombParty] Nouvelle connexion WebSocket');
        /**
         * Envoie un message d'erreur au client
         */
        function sendError(error, code) {
            const message = {
                event: 'bp:lobby:error',
                payload: {
                    error,
                    code: code || 'UNKNOWN_ERROR'
                }
            };
            try {
                socket.send(JSON.stringify(message));
            }
            catch (err) {
                console.error('❌ [BombParty] Erreur envoi message:', err);
            }
        }
        /**
         * Envoie un message de succès au client
         */
        function sendMessage(message) {
            try {
                socket.send(JSON.stringify(message));
            }
            catch (err) {
                console.error('❌ [BombParty] Erreur envoi message:', err);
            }
        }
        /**
         * Authentifie un joueur (version simplifiée)
         */
        function authenticatePlayer(playerName) {
            const nameResult = validatePlayerName(playerName);
            if (!nameResult.success) {
                sendError(nameResult.error || 'Nom invalide', 'INVALID_NAME');
                return false;
            }
            session.playerId = uuidv4();
            session.playerName = nameResult.data;
            session.authenticated = true;
            roomManager.registerPlayer(socket, session.playerId, session.playerName);
            console.log('✅ [BombParty] Joueur authentifié:', {
                id: session.playerId,
                name: session.playerName
            });
            return true;
        }
        /**
         * Vérifie l'authentification
         */
        function requireAuth() {
            if (!session.authenticated || !session.playerId) {
                sendError('Authentification requise', 'AUTH_REQUIRED');
                return false;
            }
            return true;
        }
        // Gestion des messages entrants
        socket.on('message', (data) => {
            try {
                const rawMessage = JSON.parse(data.toString());
                console.log('📨 [BombParty] Message reçu:', rawMessage);
                // Gestion spéciale pour l'authentification
                if (rawMessage.event === 'bp:auth') {
                    if (!rawMessage.payload?.playerName) {
                        sendError('Nom de joueur requis', 'MISSING_PLAYER_NAME');
                        return;
                    }
                    if (authenticatePlayer(rawMessage.payload.playerName)) {
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
                // Vérifier l'authentification pour les autres messages
                if (!requireAuth())
                    return;
                // Valider le message
                const validation = validateClientMessage(rawMessage);
                if (!validation.success) {
                    sendError(validation.error || 'Message invalide', 'VALIDATION_ERROR');
                    return;
                }
                const message = validation.data;
                const playerId = session.playerId;
                // Router les messages selon le type
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
                        sendError(`Event non supporté: ${message.event}`, 'UNSUPPORTED_EVENT');
                }
            }
            catch (error) {
                console.error('❌ [BombParty] Erreur traitement message:', error);
                sendError('Erreur traitement message', 'MESSAGE_ERROR');
            }
        });
        /**
         * Gère la création d'un lobby
         */
        function handleLobbyCreate(playerId, payload) {
            const result = roomManager.createRoom(playerId, payload.name, payload.isPrivate, payload.password);
            if (result.success) {
                sendMessage({
                    event: 'bp:lobby:created',
                    payload: {
                        roomId: result.roomId,
                        playerId
                    }
                });
            }
            else {
                sendError(result.error || 'Erreur création lobby', 'CREATE_FAILED');
            }
        }
        /**
         * Gère la connexion à un lobby
         */
        function handleLobbyJoin(playerId, payload) {
            const result = roomManager.joinRoom(playerId, payload.roomId, payload.password);
            if (result.success) {
                sendMessage({
                    event: 'bp:lobby:joined',
                    payload: {
                        roomId: payload.roomId,
                        playerId,
                        players: result.players || []
                    }
                });
            }
            else {
                let code = 'JOIN_FAILED';
                if (result.error?.includes('non trouvée'))
                    code = 'ROOM_NOT_FOUND';
                else if (result.error?.includes('pleine'))
                    code = 'ROOM_FULL';
                else if (result.error?.includes('mot de passe'))
                    code = 'WRONG_PASSWORD';
                else if (result.error?.includes('déjà dans'))
                    code = 'ALREADY_IN_ROOM';
                sendError(result.error || 'Erreur rejoindre lobby', code);
            }
        }
        /**
         * Gère la sortie d'un lobby
         */
        function handleLobbyLeave(playerId, payload) {
            const result = roomManager.leaveRoom(playerId, payload.roomId);
            if (result.success) {
                sendMessage({
                    event: 'bp:lobby:left',
                    payload: {
                        roomId: payload.roomId,
                        playerId
                    }
                });
            }
            else {
                sendError(result.error || 'Erreur sortie lobby', 'LEAVE_FAILED');
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
                sendError(result.error || 'Lobby non trouvé', 'ROOM_NOT_FOUND');
            }
        }
        /**
         * Gère le démarrage d'une partie
         */
        function handleLobbyStart(playerId, payload) {
            const result = roomManager.startGame(playerId, payload.roomId);
            if (!result.success) {
                sendError(result.error || 'Erreur démarrage partie', 'START_FAILED');
            }
            // Le succès est géré par le broadcasting automatique du RoomManager
        }
        /**
         * Gère l'entrée d'un mot dans le jeu
         */
        function handleGameInput(playerId, payload) {
            const result = roomManager.handleGameInput(playerId, payload.roomId, payload.word, payload.msTaken);
            if (!result.success) {
                sendError(result.error || 'Erreur entrée jeu', 'INPUT_FAILED');
            }
            // Le succès est géré par le broadcasting automatique du RoomManager
        }
        /**
         * Gère l'activation d'un bonus
         */
        function handleBonusActivate(playerId, payload) {
            const result = roomManager.activateBonus(playerId, payload.roomId, payload.bonusKey);
            if (!result.success) {
                sendError(result.error || 'Erreur activation bonus', 'BONUS_FAILED');
            }
            // Le succès est géré par le broadcasting automatique du RoomManager
        }
        // Gestion de la déconnexion
        socket.on('close', () => {
            console.log('❌ [BombParty] Connexion fermée:', session.playerName || 'Anonyme');
            // Le cleanup est géré automatiquement par le RoomManager
        });
        socket.on('error', (error) => {
            console.error('❌ [BombParty] Erreur WebSocket:', error);
        });
        // Envoyer un message de bienvenue
        sendMessage({
            event: 'bp:welcome',
            payload: {
                message: 'Connexion Bomb Party établie',
                version: '1.0.0'
            }
        });
    });
    console.log('🎮 [BombParty] Handlers WebSocket enregistrés sur /bombparty/ws');
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
