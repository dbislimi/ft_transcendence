import type WebSocket from 'ws';
import { BombPartyEngine } from './GameEngine.ts';
import { AsyncLock } from '../../utils/AsyncLock.ts';
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
import { broadcastToRoom } from './room/roomUtils.ts';
import { broadcastTurnStartedWithState, broadcastGameState } from './room/roomHandlers.ts';

export class BombPartyRoomManager {
  private rooms = new Map<string, Room>();
  private players = new Map<string, PlayerConnection>();
  private roomEngines = new Map<string, BombPartyEngine>();
  private turnCheckInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private gameEndCallbacks = new Map<string, (roomId: string, winnerId?: string) => void>();
  private roomLocks = new Map<string, AsyncLock>();
  private disconnectionGracePeriods = new Map<string, NodeJS.Timeout>();
  private rejoinPrompts = new Map<string, { roomId: string; timestamp: number; timeout: number }>();

  private readonly INACTIVE_ROOM_TIMEOUT = 30 * 60 * 1000;
  private readonly EMPTY_ROOM_TIMEOUT = 5 * 60 * 1000;

  constructor() {
    this.turnCheckInterval = this.startTurnCheckInterval();
    this.cleanupInterval = this.startCleanupInterval();
  }

  private getRoomLock(roomId: string): AsyncLock {
    if (!this.roomLocks.has(roomId)) {
      this.roomLocks.set(roomId, new AsyncLock());
    }
    return this.roomLocks.get(roomId)!;
  }

  registerGameEndCallback(roomId: string, callback: (roomId: string, winnerId?: string) => void): void {
    this.gameEndCallbacks.set(roomId, callback);
  }

  unregisterGameEndCallback(roomId: string): void {
    this.gameEndCallbacks.delete(roomId);
  }

  private triggerGameEndCallback(roomId: string, winnerId?: string): void {
    const callback = this.gameEndCallbacks.get(roomId);
    if (callback) {
      callback(roomId, winnerId);
      this.gameEndCallbacks.delete(roomId);
    }
  }

  private startTurnCheckInterval(): NodeJS.Timeout {
    const checkLoop = async () => {
      
      const roomIds = Array.from(this.roomEngines.keys());

      for (const roomId of roomIds) {
        const lock = this.getRoomLock(roomId);

        

        await lock.acquire(() => {
          const engine = this.roomEngines.get(roomId);
          if (!engine) return; 
  

          if (engine.checkAndEndExpiredTurn()) {
            console.log('[RoomManager] Tour expire detecte, broadcast de l\'etat mis à jour');
            const room = this.rooms.get(roomId);
            if (room) {
              const gameState = engine.getState();

              if (gameState.phase === 'TURN_ACTIVE') {
                broadcastTurnStartedWithState(roomId, this.roomEngines, this.rooms);
              } else {
                broadcastGameState(roomId, this.roomEngines, this.rooms);
              }
            }

            if (engine.isGameOver()) {
              const winner = engine.getWinner();
              const winnerId = winner?.id;

              this.triggerGameEndCallback(roomId, winnerId);

              const finalStats = engine.getFinalStats();
              if (room) {
                broadcastToRoom(room, {
                  event: 'bp:game:end',
                  payload: {
                    roomId,
                    winner: winner || undefined,
                    finalStats
                  }
                });
              }

              this.roomEngines.delete(roomId);
              if (room) {
                room.startedAt = undefined;
              }

              if (room && room.players.size === 0) {
                this.rooms.delete(roomId);
                this.roomLocks.delete(roomId);
              }
            }
          }
        });
      }

      if (this.turnCheckInterval) {
        this.turnCheckInterval = setTimeout(checkLoop, 150);
      }
    };

    return setTimeout(checkLoop, 150);
  }

  registerPlayer(ws: WebSocket, playerId: string, playerName: string): void {
    const player: PlayerConnection = {
      id: playerId,
      name: playerName,
      ws,
      roomId: undefined
    };

    this.players.set(playerId, player);

    ws.on('close', async () => {
      
      const currentPlayer = this.players.get(playerId);
      const roomId = currentPlayer?.roomId;

      if (roomId) {
        const lock = this.getRoomLock(roomId);
        await lock.acquire(() => {
          handlePlayerDisconnect(playerId, this.players, this.rooms, this.roomEngines);
        });
      } else {
        handlePlayerDisconnect(playerId, this.players, this.rooms, this.roomEngines);
      }
    });
  }

  createRoom(creatorId: string, roomName: string, isPrivate: boolean, password?: string, maxPlayers?: number): CreateRoomResult {
    return handleCreateRoom(creatorId, roomName, isPrivate, password, maxPlayers, this.players, this.rooms);
  }

  async joinRoom(playerId: string, roomId: string, password?: string): Promise<JoinRoomResult> {
    const lock = this.getRoomLock(roomId);
    return lock.acquire(() => {
      return handleJoinRoom(playerId, roomId, password, this.players, this.rooms);
    });
  }

  async leaveRoom(playerId: string, roomId: string, ws?: WebSocket): Promise<LeaveRoomResult> {
    const lock = this.getRoomLock(roomId);
    return lock.acquire(() => {
      return handleLeaveRoom(playerId, roomId, this.players, this.rooms, this.roomEngines, ws);
    });
  }

  handlePlayerDisconnect(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    
    const roomId = player.roomId;
    if (roomId) {
      const lock = this.getRoomLock(roomId);
      lock.acquire(() => {
        handlePlayerDisconnect(playerId, this.players, this.rooms, this.roomEngines);
      });
    } else {
      handlePlayerDisconnect(playerId, this.players, this.rooms, this.roomEngines);
    }
  }

  async startGame(playerId: string, roomId: string): Promise<StartGameResult> {
    const lock = this.getRoomLock(roomId);

    return lock.acquire(() => {
      if (this.roomEngines.has(roomId)) {
        return { success: false, error: 'Partie deja en cours' };
      }
      return handleStartGame(playerId, roomId, this.rooms, this.roomEngines);
    });
  }

  async handleGameInput(playerId: string, roomId: string, word: string, msTaken: number): Promise<GameInputResult> {
    const lock = this.getRoomLock(roomId);

    return lock.acquire(() => {
      return handleGameInput(playerId, roomId, word, msTaken, this.roomEngines, this.rooms);
    });
  }

  async activateBonus(playerId: string, roomId: string, bonusKey: any): Promise<ActivateBonusResult> {
    const lock = this.getRoomLock(roomId);

    return lock.acquire(() => {
      return handleActivateBonus(playerId, roomId, bonusKey, this.roomEngines, this.rooms);
    });
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

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
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

  hasGameInProgress(roomId: string): boolean {
    return this.roomEngines.has(roomId);
  }

  markPlayerForRejoin(playerId: string, roomId: string): void {
    const timeoutMs = 10000;
    this.rejoinPrompts.set(playerId, {
      roomId,
      timestamp: Date.now(),
      timeout: timeoutMs
    });

  
    setTimeout(() => {
      this.rejoinPrompts.delete(playerId);
    }, timeoutMs);
  }

  canPlayerRejoin(playerId: string, roomId: string): boolean {
    const prompt = this.rejoinPrompts.get(playerId);
    if (!prompt) return false;
    if (prompt.roomId !== roomId) return false;
    
    const elapsed = Date.now() - prompt.timestamp;
    if (elapsed > prompt.timeout) {
      this.rejoinPrompts.delete(playerId);
      return false;
    }

  
    this.rejoinPrompts.delete(playerId);
    return true;
  }

  getRoomStateForReconnect(playerId: string, roomId: string): {
    success: boolean;
    gameState?: any;
    sequenceNumber?: number;
    stateVersion?: number;
    error?: string
  } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (!room.players.has(playerId)) {
      return { success: false, error: 'Player not in room' };
    }

    const engine = this.roomEngines.get(roomId);
    if (!engine) {
      return {
        success: true,
        gameState: null,
        sequenceNumber: room.sequenceNumber || 0,
        stateVersion: room.stateVersion || 0
      };
    }

    const gameState = engine.getState();
    const stateWithVersion = {
      ...gameState,
      stateVersion: room.stateVersion || 0,
      sequenceNumber: room.sequenceNumber || 0
    };

    return {
      success: true,
      gameState: stateWithVersion,
      sequenceNumber: room.sequenceNumber || 0,
      stateVersion: room.stateVersion || 0
    };
  }

  private startCleanupInterval(): NodeJS.Timeout {
    return setInterval(async () => {
      await this.cleanupInactiveRooms();
    }, 60000);
  }

  private async cleanupInactiveRooms(): Promise<void> {
    const now = Date.now();
    const roomsToDelete: string[] = [];
    const roomIds = Array.from(this.rooms.keys());

    for (const roomId of roomIds) {
      const lock = this.getRoomLock(roomId);

      await lock.acquire(() => {
        const room = this.rooms.get(roomId);
        if (!room) return; 


        const hasGameInProgress = this.roomEngines.has(roomId);
        const isEmpty = room.players.size === 0;
        const roomAge = now - room.createdAt;
        const lastActivity = room.startedAt || room.createdAt;
        const timeSinceLastActivity = now - lastActivity;

        if (isEmpty && roomAge > this.EMPTY_ROOM_TIMEOUT) {
          roomsToDelete.push(roomId);
          return;
        }

        if (!hasGameInProgress && !isEmpty && timeSinceLastActivity > this.INACTIVE_ROOM_TIMEOUT) {
          roomsToDelete.push(roomId);
          return;
        }

        if (hasGameInProgress) {
          const engine = this.roomEngines.get(roomId);
          if (engine && engine.isGameOver()) {
            const gameEndTime = room.startedAt || room.createdAt;
            if (now - gameEndTime > 10 * 60 * 1000) {
              roomsToDelete.push(roomId);
            }
          }
        }
      });
    }

    for (const roomId of roomsToDelete) {
      const lock = this.getRoomLock(roomId);
      await lock.acquire(() => {
        const room = this.rooms.get(roomId);
        if (room) {
          if (room.players.size > 0) {
            broadcastToRoom(room, {
              event: 'bp:lobby:closed',
              payload: {
                roomId,
                reason: 'Lobby inactif supprime'
              }
            });
          }

          this.roomEngines.delete(roomId);
          this.rooms.delete(roomId);
          this.roomLocks.delete(roomId);
          console.log(`[RoomManager] Lobby inactif supprime: ${roomId}`);
        }
      });
    }

    if (roomsToDelete.length > 0) {
      this.broadcastLobbyListUpdate();
    }
  }

  private broadcastLobbyListCallback: (() => void) | null = null;

  setBroadcastLobbyListCallback(callback: () => void): void {
    this.broadcastLobbyListCallback = callback;
  }

  broadcastLobbyListUpdate(): void {
    if (this.broadcastLobbyListCallback) {
      this.broadcastLobbyListCallback();
    }
  }

  cleanup(): void {
    if (this.turnCheckInterval) {
      clearTimeout(this.turnCheckInterval);
      this.turnCheckInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.rooms.clear();
    this.players.clear();
    this.roomEngines.clear();
    this.gameEndCallbacks.clear();
    this.roomLocks.clear();
  }
}
