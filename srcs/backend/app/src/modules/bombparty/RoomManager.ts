import type WebSocket from 'ws';
import { BombPartyEngine } from './GameEngine.ts';
import {
  type Room,
  type PlayerConnection,
  type CreateRoomResult,
  type JoinRoomResult,
  type LeaveRoomResult,
  type StartGameResult,
  type GameInputResult,
  type ActivateBonusResult,
  type RoomDetailsResult,
  type RoomInfo,
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
  handleStartGame,
  handleGameInput,
  handleActivateBonus,
  handlePlayerDisconnect,
  startTurnCheckInterval,
  cleanupInterval
} from './room/index.ts';

export class BombPartyRoomManager {
  private rooms = new Map<string, Room>();
  private players = new Map<string, PlayerConnection>();
  private roomEngines = new Map<string, BombPartyEngine>();
  private turnCheckInterval: NodeJS.Timeout | null = null;
  private gameEndCallbacks = new Map<string, (roomId: string, winnerId?: string) => void>();
  // Lock pour éviter les conditions de course sur handleGameInput
  private roomInputLocks = new Map<string, Promise<void>>();

  constructor() {
    this.turnCheckInterval = this.startTurnCheckInterval();
  }

  // enregistre un callback quand une partie se termine dans une room
  registerGameEndCallback(roomId: string, callback: (roomId: string, winnerId?: string) => void): void {
    this.gameEndCallbacks.set(roomId, callback);
  }

  // desenregistre le callback
  unregisterGameEndCallback(roomId: string): void {
    this.gameEndCallbacks.delete(roomId);
  }

  // declenche le callback de fin de partie
  private triggerGameEndCallback(roomId: string, winnerId?: string): void {
    const callback = this.gameEndCallbacks.get(roomId);
    if (callback) {
      callback(roomId, winnerId);
      this.gameEndCallbacks.delete(roomId);
    }
  }

  // intervalle custom qui check les tours et gere les callbacks de fin
  private startTurnCheckInterval(): NodeJS.Timeout {
    return setInterval(() => {
      for (const [roomId, engine] of this.roomEngines) {
        if (engine.checkAndEndExpiredTurn()) {
          // broadcast l'etat du jeu
          const room = this.rooms.get(roomId);
          if (room) {
            const gameState = engine.getState();
            for (const player of room.players.values()) {
              if (player.ws && player.ws.readyState === 1) {
                player.ws.send(JSON.stringify({
                  event: 'bp:game:state',
                  payload: { roomId, gameState }
                }));
              }
            }
          }

          // check si la partie est finie
          if (engine.isGameOver()) {
            const winner = engine.getWinner();
            const winnerId = winner?.id;

            // declenche le callback d'abord (pour les tournois)
            this.triggerGameEndCallback(roomId, winnerId);

            // puis envoie le message de fin aux joueurs
            const finalStats = engine.getFinalStats();
            if (room) {
              for (const player of room.players.values()) {
                if (player.ws && player.ws.readyState === 1) {
                  player.ws.send(JSON.stringify({
                    event: 'bp:game:end',
                    payload: {
                      roomId,
                      winner: winner || undefined,
                      finalStats
                    }
                  }));
                }
              }
            }

            // cleanup explicite pour éviter les fuites mémoire
            this.roomEngines.delete(roomId);
            if (room) {
              room.startedAt = undefined;
            }
            
            // Si la room est vide après la fin de partie, la supprimer
            if (room && room.players.size === 0) {
              this.rooms.delete(roomId);
            }
          }
        }
      }
    }, 1000);
  }

  registerPlayer(ws: WebSocket, playerId: string, playerName: string): void {
    const player: PlayerConnection = {
      id: playerId,
      name: playerName,
      ws,
      roomId: undefined
    };

    this.players.set(playerId, player);
    
    ws.on('close', () => {
      handlePlayerDisconnect(playerId, this.players, this.rooms, this.roomEngines);
    });
  }

  createRoom(creatorId: string, roomName: string, isPrivate: boolean, password?: string, maxPlayers?: number): CreateRoomResult {
    return handleCreateRoom(creatorId, roomName, isPrivate, password, maxPlayers, this.players, this.rooms);
  }

  joinRoom(playerId: string, roomId: string, password?: string): JoinRoomResult {
    return handleJoinRoom(playerId, roomId, password, this.players, this.rooms);
  }

  leaveRoom(playerId: string, roomId: string): LeaveRoomResult {
    return handleLeaveRoom(playerId, roomId, this.players, this.rooms, this.roomEngines);
  }

  startGame(playerId: string, roomId: string): StartGameResult {
    return handleStartGame(playerId, roomId, this.rooms, this.roomEngines);
  }

  async handleGameInput(playerId: string, roomId: string, word: string, msTaken: number): Promise<GameInputResult> {
    // Attendre que le lock précédent soit libéré pour cette room
    const previousLock = this.roomInputLocks.get(roomId);
    
    let result: GameInputResult;
    
    // Créer un nouveau lock pour cette requête
    const currentLock = (previousLock || Promise.resolve()).then(() => {
      return new Promise<void>((resolve) => {
        // Exécuter handleGameInput de manière synchrone pour cette room
        result = handleGameInput(playerId, roomId, word, msTaken, this.roomEngines, this.rooms);
        
        // Libérer le lock après un court délai pour permettre au broadcast de se terminer
        setTimeout(() => {
          resolve();
        }, 10);
      });
    });
    
    // Mettre à jour le lock pour cette room
    this.roomInputLocks.set(roomId, currentLock);
    
    // Attendre que cette requête soit traitée
    await currentLock;
    
    // Nettoyer le lock si c'était la dernière requête en attente
    if (this.roomInputLocks.get(roomId) === currentLock) {
      this.roomInputLocks.delete(roomId);
    }
    
    return result!;
  }

  activateBonus(playerId: string, roomId: string, bonusKey: any): ActivateBonusResult {
    return handleActivateBonus(playerId, roomId, bonusKey, this.roomEngines, this.rooms);
  }


  getRoomInfo(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getPlayerInfo(playerId: string): PlayerConnection | undefined {
    return this.players.get(playerId);
  }

  getAllRooms(): RoomInfo[] {
    const allRooms: RoomInfo[] = [];

    for (const [roomId, room] of this.rooms) {
      allRooms.push({
        id: roomId,
        name: room.name,
        players: room.players.size,
        maxPlayers: room.maxPlayers,
        isPrivate: room.isPrivate,
        isStarted: this.roomEngines.has(roomId),
        createdAt: room.createdAt
      });
    }

    return allRooms.sort((a, b) => b.createdAt - a.createdAt);
  }

  getPublicRooms(): RoomInfo[] {
    return this.getAllRooms().filter(room => !room.isPrivate);
  }

  getRoomDetails(roomId: string): RoomDetailsResult {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
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

  cleanup(): void {
    if (this.turnCheckInterval) {
      clearInterval(this.turnCheckInterval);
      this.turnCheckInterval = null;
    }
    this.rooms.clear();
    this.players.clear();
    this.roomEngines.clear();
    this.gameEndCallbacks.clear();
  }
}
