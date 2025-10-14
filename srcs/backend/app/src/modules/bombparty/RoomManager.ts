/**
 * Room Manager pour Bomb Party
 * 
 * Gère les lobbies, les salles de jeu et les connexions WebSocket
 */

import type WebSocket from 'ws';
// Types locaux
export interface Room {
  id: string;
  name: string;
  isPrivate: boolean;
  password?: string;
  maxPlayers: number;
  players: Map<string, PlayerConnection>;
  createdAt: number;
}

export interface BPServerMessage {
  event: string;
  payload: any;
}

export interface BPGameEndMessage {
  event: 'bp:game:end';
  payload: {
    roomId: string;
    winner?: {
      id: string;
      name: string;
    };
    finalStats: any;
  };
}

import type { Player } from './GameEngine.ts';
import { BombPartyEngine } from './GameEngine.ts';
import { v4 as uuidv4 } from 'uuid';

interface PlayerConnection {
  id: string;
  name: string;
  ws: WebSocket;
  roomId?: string;
}

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
  private rooms = new Map<string, Room>();
  private players = new Map<string, PlayerConnection>();
  private roomEngines = new Map<string, BombPartyEngine>();

  constructor() {
  }

  /**
   * Enregistre une nouvelle connexion joueur
   */
  registerPlayer(ws: WebSocket, playerId: string, playerName: string): void {
    const player: PlayerConnection = {
      id: playerId,
      name: playerName,
      ws,
      roomId: undefined
    };

    this.players.set(playerId, player);
    

    // Cleanup on disconnect
    ws.on('close', () => {
      this.handlePlayerDisconnect(playerId);
    });
  }

  /**
   * Crée une nouvelle salle de jeu
   */
  createRoom(creatorId: string, roomName: string, isPrivate: boolean, password?: string, maxPlayers?: number): {
    success: boolean;
    roomId?: string;
    maxPlayers?: number;
    error?: string;
  } {
    
    const creator = this.players.get(creatorId);
    if (!creator) {
      return { success: false, error: 'Joueur non trouvé' };
    }

    if (creator.roomId) {
      return { success: false, error: 'Déjà dans une salle' };
    }

    const validMaxPlayers = Math.max(2, Math.min(12, maxPlayers || 4));

    const roomId = uuidv4();
    const room: Room = {
      id: roomId,
      name: roomName,
      isPrivate,
      password,
      maxPlayers: validMaxPlayers,
      players: new Map(),
      createdAt: Date.now()
    };

    room.players.set(creatorId, {
      id: creatorId,
      name: creator.name,
      ws: creator.ws
    });

    creator.roomId = roomId;
    this.rooms.set(roomId, room);


    return { success: true, roomId, maxPlayers: validMaxPlayers };
  }

  /**
   * Fait rejoindre un joueur à une salle
   */
  joinRoom(playerId: string, roomId: string, password?: string): {
    success: boolean;
    players?: Array<{ id: string; name: string }>;
    maxPlayers?: number;
    error?: string;
  } {
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


    // Notifier les autres joueurs
    this.broadcastToRoom(roomId, {
      event: 'bp:lobby:joined',
      payload: {
        roomId,
        playerId,
        players: playersList,
        maxPlayers: room.maxPlayers
      }
    }, [playerId]);

    return { success: true, players: playersList, maxPlayers: room.maxPlayers };
  }

  /**
   * Fait quitter un joueur d'une salle
   */
  leaveRoom(playerId: string, roomId: string): {
    success: boolean;
    error?: string;
  } {
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

    room.players.delete(playerId);
    player.roomId = undefined;

    const playersList = Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name
    }));


    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      if (this.roomEngines.has(roomId)) {
        this.roomEngines.delete(roomId);
      }
    } else {
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
  startGame(playerId: string, roomId: string): {
    success: boolean;
    error?: string;
  } {
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

    const engine = new BombPartyEngine();
    const players = Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name
    }));

    engine.initializeGame(players);
    this.roomEngines.set(roomId, engine);
    
    room.startedAt = Date.now();


    // Notifier tous les joueurs
    this.broadcastToRoom(roomId, {
      event: 'bp:game:state',
      payload: {
        roomId,
        gameState: engine.getState()
      }
    });

    setTimeout(() => {
      const gameEngine = this.roomEngines.get(roomId);
      if (gameEngine) {
        gameEngine.startCountdown();
        this.broadcastGameState(roomId);
        
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
  handleGameInput(playerId: string, roomId: string, word: string, msTaken: number): {
    success: boolean;
    error?: string;
  } {
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
        engine.resolveTurn(true, false);
      }
    } else {
      engine.resolveTurn(false, false);
    }

    this.broadcastGameState(roomId);

    if (engine.isGameOver()) {
      this.handleGameEnd(roomId);
    }

    return { success: true };
  }

  /**
   * Active un bonus pour un joueur
   */
  activateBonus(playerId: string, roomId: string, bonusKey: any): {
    success: boolean;
    error?: string;
    meta?: any;
  } {
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
  private handleGameEnd(roomId: string): void {
    const engine = this.roomEngines.get(roomId);
    const room = this.rooms.get(roomId);
    
    if (!engine || !room) return;

    const winner = engine.getWinner();
    const finalStats = engine.getFinalStats();


    const endMessage: BPGameEndMessage = {
      event: 'bp:game:end',
      payload: {
        roomId,
        winner: winner || undefined,
        reason: 'VICTORY',
        finalStats
      }
    };

    this.broadcastToRoom(roomId, endMessage);

    this.roomEngines.delete(roomId);
    room.startedAt = undefined;
  }

  /**
   * Gère la déconnexion d'un joueur
   */
  private handlePlayerDisconnect(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;


    if (player.roomId) {
      const room = this.rooms.get(player.roomId);
      const engine = this.roomEngines.get(player.roomId);
      
      if (room) {
        room.players.delete(playerId);
        
        if (room.players.size === 0) {
          this.rooms.delete(player.roomId);
          if (engine) {
            this.roomEngines.delete(player.roomId);
          }
        } else if (engine && engine.getCurrentPlayer()?.id === playerId) {
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
  private broadcastGameState(roomId: string): void {
    const engine = this.roomEngines.get(roomId);
    if (!engine) return;

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
  private broadcastToRoom(roomId: string, message: BPServerMessage, excludePlayerIds: string[] = []): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    
    for (const [playerId, playerData] of room.players) {
      if (!excludePlayerIds.includes(playerId)) {
        try {
          playerData.ws.send(messageStr);
        } catch (error) {
          console.error('❌ [BombParty] Erreur envoi message:', error);
        }
      }
    }
  }

  /**
   * Obtient les informations d'une salle
   */
  getRoomInfo(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Obtient les informations d'un joueur
   */
  getPlayerInfo(playerId: string): PlayerConnection | undefined {
    return this.players.get(playerId);
  }

  /**
   * Liste des salles publiques disponibles
   */
  getPublicRooms(): Array<{
    id: string;
    name: string;
    players: number;
    maxPlayers: number;
    isStarted: boolean;
    createdAt: number;
  }> {
    const publicRooms: Array<{
      id: string;
      name: string;
      players: number;
      maxPlayers: number;
      isStarted: boolean;
      createdAt: number;
    }> = [];

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

    return publicRooms.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Obtient les détails d'une salle spécifique
   */
  getRoomDetails(roomId: string): {
    success: boolean;
    room?: {
      id: string;
      name: string;
      isPrivate: boolean;
      players: Array<{ id: string; name: string }>;
      maxPlayers: number;
      isStarted: boolean;
      createdAt: number;
    };
    error?: string;
  } {
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
  cleanup(): void {
    this.rooms.clear();
    this.players.clear();
    this.roomEngines.clear();
  }
}
