import { BombPartyEngine } from '../GameEngine';
import type { 
  Room, 
  PlayerConnection, 
  BPServerMessage, 
  BPGameEndMessage,
  CreateRoomResult,
  JoinRoomResult,
  LeaveRoomResult,
  StartGameResult,
  GameInputResult,
  ActivateBonusResult
} from './roomTypes';
import { 
  broadcastToRoom, 
  getPlayersList, 
  validateRoomJoin, 
  validateRoomCreation, 
  validateGameStart,
  cleanupEmptyRoom
} from './roomUtils';

export function handleCreateRoom(
  creatorId: string,
  roomName: string,
  isPrivate: boolean,
  password: string | undefined,
  maxPlayers: number | undefined,
  players: Map<string, PlayerConnection>,
  rooms: Map<string, Room>
): CreateRoomResult {
  const creator = players.get(creatorId);
  const validation = validateRoomCreation(creator, maxPlayers);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const roomId = require('uuid').v4();
  const room: Room = {
    id: roomId,
    name: roomName,
    isPrivate,
    password,
    maxPlayers: validation.validMaxPlayers!,
    players: new Map(),
    createdAt: Date.now()
  };

  room.players.set(creatorId, {
    id: creatorId,
    name: creator!.name,
    ws: creator!.ws
  });

  creator!.roomId = roomId;
  rooms.set(roomId, room);

  return { success: true, roomId, maxPlayers: validation.validMaxPlayers };
}

export function handleJoinRoom(
  playerId: string,
  roomId: string,
  password: string | undefined,
  players: Map<string, PlayerConnection>,
  rooms: Map<string, Room>
): JoinRoomResult {
  const player = players.get(playerId);
  const room = rooms.get(roomId);
  
  const validation = validateRoomJoin(player, room, password);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  room!.players.set(playerId, {
    id: playerId,
    name: player!.name,
    ws: player!.ws
  });

  player!.roomId = roomId;

  const playersList = getPlayersList(room!);

  broadcastToRoom(room, {
    event: 'bp:lobby:joined',
    payload: {
      roomId,
      playerId,
      players: playersList,
      maxPlayers: room!.maxPlayers
    }
  }, [playerId]);

  return { success: true, players: playersList, maxPlayers: room!.maxPlayers };
}

export function handleLeaveRoom(
  playerId: string,
  roomId: string,
  players: Map<string, PlayerConnection>,
  rooms: Map<string, Room>,
  roomEngines: Map<string, BombPartyEngine>
): LeaveRoomResult {
  const player = players.get(playerId);
  const room = rooms.get(roomId);

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

  const playersList = getPlayersList(room);

  cleanupEmptyRoom(room, roomId, rooms, roomEngines);

  if (room.players.size > 0) {
    broadcastToRoom(room, {
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

export function handleStartGame(
  playerId: string,
  roomId: string,
  rooms: Map<string, Room>,
  roomEngines: Map<string, BombPartyEngine>
): StartGameResult {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, error: 'Salle non trouvée' };
  }

  const validation = validateGameStart(room, roomEngines.has(roomId));
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const engine = new BombPartyEngine();
  const players = getPlayersList(room);

  engine.initializeGame(players);
  roomEngines.set(roomId, engine);
  
  room.startedAt = Date.now();

  broadcastToRoom(room, {
    event: 'bp:game:state',
    payload: {
      roomId,
      gameState: engine.getState()
    }
  });

  setTimeout(() => {
    const gameEngine = roomEngines.get(roomId);
    if (gameEngine) {
      gameEngine.startCountdown();
      broadcastGameState(roomId, roomEngines, rooms);
      
      setTimeout(() => {
        if (roomEngines.has(roomId)) {
          gameEngine.startTurn();
          broadcastTurnStarted(roomId, roomEngines, rooms);
          broadcastGameState(roomId, roomEngines, rooms);
        }
      }, 3000);
    }
  }, 1000);

  return { success: true };
}

export function handleGameInput(
  playerId: string,
  roomId: string,
  word: string,
  msTaken: number,
  roomEngines: Map<string, BombPartyEngine>,
  rooms: Map<string, Room>
): GameInputResult {
  const engine = roomEngines.get(roomId);
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
      broadcastTurnStarted(roomId, roomEngines, rooms);
    }
  } else {
    engine.resolveTurn(false, false);
    broadcastTurnStarted(roomId, roomEngines, rooms);
  }

  broadcastGameState(roomId, roomEngines, rooms);

  return { success: true };
}

export function handleActivateBonus(
  playerId: string,
  roomId: string,
  bonusKey: any,
  roomEngines: Map<string, BombPartyEngine>,
  rooms: Map<string, Room>
): ActivateBonusResult {
  const engine = roomEngines.get(roomId);
  if (!engine) {
    return { success: false, error: 'Partie non trouvée' };
  }

  const result = engine.activateBonus(playerId, bonusKey);
  
  if (result.ok) {
    const room = rooms.get(roomId);
    broadcastToRoom(room, {
      event: 'bp:bonus:applied',
      payload: {
        roomId,
        playerId,
        bonusKey,
        appliedAt: Date.now(),
        meta: result.meta
      }
    });

    broadcastGameState(roomId, roomEngines, rooms);
  }

  return { success: result.ok, meta: result.meta };
}

export function handlePlayerDisconnect(
  playerId: string,
  players: Map<string, PlayerConnection>,
  rooms: Map<string, Room>,
  roomEngines: Map<string, BombPartyEngine>
): void {
  const player = players.get(playerId);
  if (!player) return;

  if (player.roomId) {
    const room = rooms.get(player.roomId);
    const engine = roomEngines.get(player.roomId);
    
    if (room) {
      room.players.delete(playerId);
      
      cleanupEmptyRoom(room, player.roomId, rooms, roomEngines);
      
      if (room.players.size > 0 && engine && engine.getCurrentPlayer()?.id === playerId) {
        engine.resolveTurn(false, true);
        broadcastGameState(player.roomId, roomEngines, rooms);
        
        if (engine.isGameOver()) {
          handleGameEnd(player.roomId, roomEngines, rooms);
        }
      }
    }
  }

  players.delete(playerId);
}

export function handleGameEnd(
  roomId: string,
  roomEngines: Map<string, BombPartyEngine>,
  rooms: Map<string, Room>
): void {
  const engine = roomEngines.get(roomId);
  const room = rooms.get(roomId);
  
  if (!engine || !room) return;

  const winner = engine.getWinner();
  const finalStats = engine.getFinalStats();

  const endMessage: BPGameEndMessage = {
    event: 'bp:game:end',
    payload: {
      roomId,
      winner: winner || undefined,
      finalStats
    }
  };

  broadcastToRoom(room, endMessage);

  roomEngines.delete(roomId);
  room.startedAt = undefined;
}

export function broadcastTurnStarted(
  roomId: string,
  roomEngines: Map<string, BombPartyEngine>,
  rooms: Map<string, Room>
): void {
  const engine = roomEngines.get(roomId);
  const room = rooms.get(roomId);
  if (!engine || !room) return;

  const event = engine.getTurnStartedEvent();
  broadcastToRoom(room, {
    event: 'turn_started',
    payload: event
  });
}

export function broadcastGameState(
  roomId: string,
  roomEngines: Map<string, BombPartyEngine>,
  rooms: Map<string, Room>
): void {
  const engine = roomEngines.get(roomId);
  const room = rooms.get(roomId);
  if (!engine || !room) return;

  const event = engine.getGameStateSyncEvent();
  broadcastToRoom(room, {
    event: 'game_state',
    payload: event
  });
}
