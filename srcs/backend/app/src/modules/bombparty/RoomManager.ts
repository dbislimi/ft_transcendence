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

  constructor() {
    this.turnCheckInterval = startTurnCheckInterval(this.roomEngines, this.rooms);
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

  handleGameInput(playerId: string, roomId: string, word: string, msTaken: number): GameInputResult {
    return handleGameInput(playerId, roomId, word, msTaken, this.roomEngines, this.rooms);
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
    cleanupInterval(this.turnCheckInterval);
      this.turnCheckInterval = null;
    this.rooms.clear();
    this.players.clear();
    this.roomEngines.clear();
  }
}
