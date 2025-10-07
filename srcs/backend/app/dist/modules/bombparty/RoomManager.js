/**
 * Room Manager pour Bomb Party
 *
 * Gère les lobbies, les salles de jeu et les connexions WebSocket
 */
import { BombPartyEngine } from './GameEngine.ts';
import { v4 as uuidv4 } from 'uuid';
/**
 * Gestionnaire des salles Bomb Party
 *
 * Responsabilités:
 * - Création et gestion des lobbies
 * - Connexion/déconnexion des joueurs
 * - Lancement des parties
 * - Broadcasting des messages
 */
export class BombPartyRoomManager {
    rooms = new Map();
    players = new Map();
    roomEngines = new Map();
    constructor() {
        console.log('🏠 [BombParty] RoomManager initialisé');
    }
    /**
     * Enregistre une nouvelle connexion joueur
     */
    registerPlayer(ws, playerId, playerName) {
        const player = {
            id: playerId,
            name: playerName,
            ws,
            roomId: undefined
        };
        this.players.set(playerId, player);
        console.log('👤 [BombParty] Joueur enregistré:', {
            id: playerId,
            name: playerName
        });
        // Cleanup on disconnect
        ws.on('close', () => {
            this.handlePlayerDisconnect(playerId);
        });
    }
    /**
     * Crée une nouvelle salle de jeu
     */
    createRoom(creatorId, roomName, isPrivate, password) {
        const creator = this.players.get(creatorId);
        if (!creator) {
            return { success: false, error: 'Joueur non trouvé' };
        }
        if (creator.roomId) {
            return { success: false, error: 'Déjà dans une salle' };
        }
        const roomId = uuidv4();
        const room = {
            id: roomId,
            name: roomName,
            isPrivate,
            password,
            maxPlayers: 12, // Limite augmentée à 12 joueurs
            players: new Map(),
            createdAt: Date.now()
        };
        // Ajouter le créateur à la salle
        room.players.set(creatorId, {
            id: creatorId,
            name: creator.name,
            ws: creator.ws
        });
        creator.roomId = roomId;
        this.rooms.set(roomId, room);
        console.log('🏠 [BombParty] Salle créée:', {
            roomId,
            name: roomName,
            creator: creator.name,
            isPrivate
        });
        return { success: true, roomId };
    }
    /**
     * Fait rejoindre un joueur à une salle
     */
    joinRoom(playerId, roomId, password) {
        const player = this.players.get(playerId);
        const room = this.rooms.get(roomId);
        if (!player) {
            return { success: false, error: 'Joueur non trouvé' };
        }
        if (!room) {
            return { success: false, error: 'Salle non trouvée' };
        }
        if (player.roomId) {
            return { success: false, error: 'Déjà dans une salle' };
        }
        if (room.players.size >= room.maxPlayers) {
            return { success: false, error: 'Salle pleine' };
        }
        if (room.isPrivate && room.password !== password) {
            return { success: false, error: 'Mot de passe incorrect' };
        }
        // Ajouter le joueur à la salle
        room.players.set(playerId, {
            id: playerId,
            name: player.name,
            ws: player.ws
        });
        player.roomId = roomId;
        const playersList = Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name
        }));
        console.log('👥 [BombParty] Joueur rejoint salle:', {
            player: player.name,
            roomId,
            playersCount: room.players.size
        });
        // Notifier les autres joueurs
        this.broadcastToRoom(roomId, {
            event: 'bp:lobby:joined',
            payload: {
                roomId,
                playerId,
                players: playersList
            }
        }, [playerId]);
        return { success: true, players: playersList };
    }
    /**
     * Fait quitter un joueur d'une salle
     */
    leaveRoom(playerId, roomId) {
        const player = this.players.get(playerId);
        const room = this.rooms.get(roomId);
        if (!player) {
            return { success: false, error: 'Joueur non trouvé' };
        }
        if (!room) {
            return { success: false, error: 'Salle non trouvée' };
        }
        if (player.roomId !== roomId) {
            return { success: false, error: 'Pas dans cette salle' };
        }
        // Retirer le joueur de la salle
        room.players.delete(playerId);
        player.roomId = undefined;
        const playersList = Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name
        }));
        console.log('👋 [BombParty] Joueur a quitté la salle:', {
            player: player.name,
            roomId,
            playersCount: room.players.size
        });
        // Si c'était le dernier joueur, supprimer la salle
        if (room.players.size === 0) {
            this.rooms.delete(roomId);
            if (this.roomEngines.has(roomId)) {
                this.roomEngines.delete(roomId);
            }
            console.log('🏠 [BombParty] Salle supprimée (vide):', roomId);
        }
        else {
            // Notifier les autres joueurs
            this.broadcastToRoom(roomId, {
                event: 'bp:lobby:left',
                payload: {
                    roomId,
                    playerId,
                    players: playersList
                }
            });
        }
        return { success: true };
    }
    /**
     * Démarre une partie dans une salle
     */
    startGame(playerId, roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Salle non trouvée' };
        }
        if (room.players.size < 2) {
            return { success: false, error: 'Minimum 2 joueurs requis' };
        }
        if (this.roomEngines.has(roomId)) {
            return { success: false, error: 'Partie déjà en cours' };
        }
        // Créer le moteur de jeu
        const engine = new BombPartyEngine();
        const players = Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name
        }));
        engine.initializeGame(players);
        this.roomEngines.set(roomId, engine);
        room.startedAt = Date.now();
        console.log('🎮 [BombParty] Partie démarrée:', {
            roomId,
            players: players.length,
            starter: playerId
        });
        // Notifier tous les joueurs
        this.broadcastToRoom(roomId, {
            event: 'bp:game:state',
            payload: {
                roomId,
                gameState: engine.getState()
            }
        });
        // Démarrer le compte à rebours
        setTimeout(() => {
            const gameEngine = this.roomEngines.get(roomId);
            if (gameEngine) {
                gameEngine.startCountdown();
                this.broadcastGameState(roomId);
                // Démarrer le premier tour après le compte à rebours
                setTimeout(() => {
                    if (this.roomEngines.has(roomId)) {
                        gameEngine.startTurn();
                        this.broadcastGameState(roomId);
                    }
                }, 3000);
            }
        }, 1000);
        return { success: true };
    }
    /**
     * Traite une entrée de mot dans le jeu
     */
    handleGameInput(playerId, roomId, word, msTaken) {
        const engine = this.roomEngines.get(roomId);
        if (!engine) {
            return { success: false, error: 'Partie non trouvée' };
        }
        const currentPlayer = engine.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== playerId) {
            return { success: false, error: 'Pas votre tour' };
        }
        const result = engine.submitWord(word, msTaken);
        if (result.ok || result.consumedDoubleChance) {
            if (result.ok) {
                // Mot valide, résoudre le tour
                engine.resolveTurn(true, false);
            }
            // Si consumedDoubleChance, on continue le tour
        }
        else {
            // Mot invalide, résoudre le tour
            engine.resolveTurn(false, false);
        }
        this.broadcastGameState(roomId);
        // Vérifier la fin de partie
        if (engine.isGameOver()) {
            this.handleGameEnd(roomId);
        }
        return { success: true };
    }
    /**
     * Active un bonus pour un joueur
     */
    activateBonus(playerId, roomId, bonusKey) {
        const engine = this.roomEngines.get(roomId);
        if (!engine) {
            return { success: false, error: 'Partie non trouvée' };
        }
        const result = engine.activateBonus(playerId, bonusKey);
        if (result.ok) {
            // Notifier tous les joueurs
            this.broadcastToRoom(roomId, {
                event: 'bp:bonus:applied',
                payload: {
                    roomId,
                    playerId,
                    bonusKey,
                    appliedAt: Date.now(),
                    meta: result.meta
                }
            });
            this.broadcastGameState(roomId);
        }
        return { success: result.ok, meta: result.meta };
    }
    /**
     * Gère la fin d'une partie
     */
    handleGameEnd(roomId) {
        const engine = this.roomEngines.get(roomId);
        const room = this.rooms.get(roomId);
        if (!engine || !room)
            return;
        const winner = engine.getWinner();
        const finalStats = engine.getFinalStats();
        console.log('🏆 [BombParty] Fin de partie:', {
            roomId,
            winner: winner?.name,
            stats: finalStats
        });
        const endMessage = {
            event: 'bp:game:end',
            payload: {
                roomId,
                winner: winner || undefined,
                reason: 'VICTORY',
                finalStats
            }
        };
        this.broadcastToRoom(roomId, endMessage);
        // Nettoyer la partie (mais garder la salle pour une éventuelle nouvelle partie)
        this.roomEngines.delete(roomId);
        room.startedAt = undefined;
    }
    /**
     * Gère la déconnexion d'un joueur
     */
    handlePlayerDisconnect(playerId) {
        const player = this.players.get(playerId);
        if (!player)
            return;
        console.log('❌ [BombParty] Joueur déconnecté:', player.name);
        if (player.roomId) {
            const room = this.rooms.get(player.roomId);
            const engine = this.roomEngines.get(player.roomId);
            if (room) {
                room.players.delete(playerId);
                // Si c'était le dernier joueur, supprimer la salle
                if (room.players.size === 0) {
                    this.rooms.delete(player.roomId);
                    if (engine) {
                        this.roomEngines.delete(player.roomId);
                    }
                    console.log('🏠 [BombParty] Salle supprimée (vide):', player.roomId);
                }
                else if (engine && engine.getCurrentPlayer()?.id === playerId) {
                    // Si c'était le tour du joueur déconnecté, passer au suivant
                    engine.resolveTurn(false, true);
                    this.broadcastGameState(player.roomId);
                    if (engine.isGameOver()) {
                        this.handleGameEnd(player.roomId);
                    }
                }
            }
        }
        this.players.delete(playerId);
    }
    /**
     * Diffuse l'état du jeu à tous les joueurs d'une salle
     */
    broadcastGameState(roomId) {
        const engine = this.roomEngines.get(roomId);
        if (!engine)
            return;
        this.broadcastToRoom(roomId, {
            event: 'bp:game:state',
            payload: {
                roomId,
                gameState: engine.getState()
            }
        });
    }
    /**
     * Diffuse un message à tous les joueurs d'une salle
     */
    broadcastToRoom(roomId, message, excludePlayerIds = []) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        const messageStr = JSON.stringify(message);
        for (const [playerId, playerData] of room.players) {
            if (!excludePlayerIds.includes(playerId)) {
                try {
                    playerData.ws.send(messageStr);
                }
                catch (error) {
                    console.error('❌ [BombParty] Erreur envoi message:', error);
                }
            }
        }
    }
    /**
     * Obtient les informations d'une salle
     */
    getRoomInfo(roomId) {
        return this.rooms.get(roomId);
    }
    /**
     * Obtient les informations d'un joueur
     */
    getPlayerInfo(playerId) {
        return this.players.get(playerId);
    }
    /**
     * Liste des salles publiques disponibles
     */
    getPublicRooms() {
        const publicRooms = [];
        for (const [roomId, room] of this.rooms) {
            if (!room.isPrivate) {
                publicRooms.push({
                    id: roomId,
                    name: room.name,
                    players: room.players.size,
                    maxPlayers: room.maxPlayers,
                    isStarted: this.roomEngines.has(roomId),
                    createdAt: room.createdAt
                });
            }
        }
        // Trier par date de création (plus récentes en premier)
        return publicRooms.sort((a, b) => b.createdAt - a.createdAt);
    }
    /**
     * Obtient les détails d'une salle spécifique
     */
    getRoomDetails(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Salle non trouvée' };
        }
        return {
            success: true,
            room: {
                id: room.id,
                name: room.name,
                isPrivate: room.isPrivate,
                players: Array.from(room.players.values()).map(p => ({
                    id: p.id,
                    name: p.name
                })),
                maxPlayers: room.maxPlayers,
                isStarted: this.roomEngines.has(roomId),
                createdAt: room.createdAt
            }
        };
    }
    /**
     * Nettoie les ressources (pour les tests)
     */
    cleanup() {
        this.rooms.clear();
        this.players.clear();
        this.roomEngines.clear();
        console.log('🧹 [BombParty] RoomManager nettoyé');
    }
}
