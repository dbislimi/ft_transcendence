import { BombPartyEngine } from '../GameEngine.ts';
import { v4 as uuidv4 } from 'uuid';
import { bombPartyLogger } from '../log.ts';

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
} from './roomTypes.ts';

import {
  broadcastToRoom,
  getPlayersList,
  validateRoomJoin,
  validateRoomCreation,
  validateGameStart,
  cleanupEmptyRoom,
  incrementRoomState
} from './roomUtils.ts';

import {
  validatePlayerId,
  validateRoomId,
  validateMsTaken,
  isHost,
  isPlayerInRoom,
  isCurrentPlayer,
  canActivateBonus,
  sanitizeWord
} from '../security.ts';

export function handleCreateRoom(
  creatorId: string,
  roomName: string,
  isPrivate: boolean,
  password: string | undefined,
  maxPlayers: number | undefined,
  players: Map<string, PlayerConnection>,
  rooms: Map<string, Room>
): CreateRoomResult {
  if (!validatePlayerId(creatorId)) {
    return { success: false, error: 'Invalid player ID' };
  }
  const creator = players.get(creatorId);
  const validation = validateRoomCreation(creator, maxPlayers, roomName, password);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  const roomId = uuidv4();
  const normalizedRoomName = roomName.trim();
  const room: Room = {
    id: roomId,
    name: normalizedRoomName,
    isPrivate,
    password: password ? password.trim() : undefined,
    maxPlayers: validation.validMaxPlayers!,
    players: new Map(),
    createdAt: Date.now(),
    hostId: creatorId
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
  if (!validatePlayerId(playerId)) {
    return { success: false, error: 'Invalid player ID' };
  }
  if (!validateRoomId(roomId)) {
    return { success: false, error: 'Invalid room ID' };
  }
  const player = players.get(playerId);
  const room = rooms.get(roomId);
  if (player?.roomId === roomId && room) {
    const playersList = getPlayersList(room);
    return { success: true, players: playersList, maxPlayers: room.maxPlayers };
  }
  const validation = validateRoomJoin(player, room, password);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const existingPlayer = room!.players.get(playerId);
  if (existingPlayer) {
    if (!existingPlayer.sockets) {
      existingPlayer.sockets = new Set([existingPlayer.ws]);
    }
    existingPlayer.sockets.add(player!.ws);
  } else {
    room!.players.set(playerId, {
      id: playerId,
      name: player!.name,
      ws: player!.ws,
      sockets: new Set([player!.ws])
    });
  }
  player!.roomId = roomId;
  if ((room as any).emptyRoomTimeout) {
    clearTimeout((room as any).emptyRoomTimeout);
    (room as any).emptyRoomTimeout = undefined;
    bombPartyLogger.info({ roomId, playerId }, 'Joueur rejoint - annulation suppression room vide');
  }
  const playersList = getPlayersList(room!);
  broadcastToRoom(room, {
    event: 'bp:lobby:joined',
    payload: {
      roomId,
      playerId,
      players: playersList,
      maxPlayers: room!.maxPlayers,
      isHost: false
    }
  }, [playerId]);
  broadcastToRoom(room, {
    event: 'bp:lobby:player_joined',
    payload: {
      roomId,
      playerId,
      playerName: player!.name,
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
  roomEngines: Map<string, BombPartyEngine>,
  ws?: WebSocket
): LeaveRoomResult {
  if (!validatePlayerId(playerId)) {
    return { success: false, error: 'Invalid player ID' };
  }

  if (!validateRoomId(roomId)) {
    return { success: false, error: 'Invalid room ID' };
  }

  const player = players.get(playerId);
  const room = rooms.get(roomId);

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  if (player.roomId !== roomId) {
    return { success: false, error: 'Not in this room' };
  }
  const isHost = room.hostId === playerId;
  const hasGameInProgressForHost = roomEngines.has(roomId);
  

  if (isHost && !hasGameInProgressForHost && room.players.size > 1) {
    const hostPlayer = players.get(playerId);
    const hostName = hostPlayer?.name || 'L\'hôte';
    
  
    const remainingPlayers = Array.from(room.players.keys()).filter(id => id !== playerId);
    
    broadcastToRoom(room, {
      event: 'bp:lobby:host_disconnected',
      payload: {
        roomId,
        hostName,
        reason: 'host_left'
      }
    }, [playerId]);
    
  
    for (const remainingPlayerId of remainingPlayers) {
      const remainingPlayer = players.get(remainingPlayerId);
      if (remainingPlayer) {
        remainingPlayer.roomId = undefined;
      }
      room.players.delete(remainingPlayerId);
    }
    
  
    room.players.clear();
    rooms.delete(roomId);
    if (roomEngines.has(roomId)) {
      roomEngines.delete(roomId);
    }
    
    player.roomId = undefined;
    return { success: true };
  }
  
  let newHostId: string | undefined;
  if (room.hostId === playerId && room.players.size > 1) {
    const remainingPlayers = Array.from(room.players.keys()).filter(id => id !== playerId);
    if (remainingPlayers.length > 0) {
      newHostId = remainingPlayers[0];
      room.hostId = newHostId;
    }
  }

  const roomPlayer = room.players.get(playerId);
  if (roomPlayer) {
    if (ws && roomPlayer.sockets && roomPlayer.sockets.size > 1) {
      roomPlayer.sockets.delete(ws);
      if (roomPlayer.ws === ws && roomPlayer.sockets.size > 0) {
        roomPlayer.ws = Array.from(roomPlayer.sockets)[0];
      }
    } else {
      room.players.delete(playerId);
      player.roomId = undefined;
    }
  } else {
    player.roomId = undefined;
  }

  const playersList = getPlayersList(room);

  const playerStillInRoom = room.players.has(playerId);

  const hasGameInProgress = roomEngines.has(roomId);
  const gracePeriodMs = hasGameInProgress ? 10000 : 0;

  cleanupEmptyRoom(room, roomId, rooms, roomEngines, gracePeriodMs);

  if (playerStillInRoom === false && room.players.size > 0) {
    const leftMessage: any = {
      event: 'bp:lobby:left',
      payload: {
        roomId,
        playerId,
        players: playersList
      }
    };

    if (newHostId) {
      leftMessage.payload.newHostId = newHostId;
      leftMessage.payload.hostTransferred = true;
    }

    broadcastToRoom(room, leftMessage);
  }

  return { success: true, newHostId };
}

export function handleStartGame(
  playerId: string,
  roomId: string,
  rooms: Map<string, Room>,
  roomEngines: Map<string, BombPartyEngine>
): StartGameResult {
  if (!validatePlayerId(playerId)) {
    return { success: false, error: 'Invalid player ID' };
  }

  if (!validateRoomId(roomId)) {
    return { success: false, error: 'Invalid room ID' };
  }

  const room = rooms.get(roomId);
  if (!room) {
    bombPartyLogger.warn({ roomId, playerId }, 'Room not found in handleStartGame');
    return { success: false, error: 'Room not found' };
  }

  if (!isPlayerInRoom(room, playerId)) {
    return { success: false, error: 'Player not in room' };
  }

  if (!isHost(room, playerId)) {
    bombPartyLogger.warn({ roomId, playerId, hostId: room.hostId }, 'Only host can start game');
    return { success: false, error: 'Only the host can start the game' };
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

  const countdownStartTime = Date.now();
  const countdownDuration = 3000;
  broadcastToRoom(room, {
    event: 'bp:game:countdown',
    payload: {
      roomId,
      startTime: countdownStartTime,
      countdownDuration
    }
  });

  setTimeout(() => {
    const gameEngine = roomEngines.get(roomId);
    const currentRoom = rooms.get(roomId);
    if (gameEngine && currentRoom) {
      gameEngine.startCountdown();
      broadcastToRoom(currentRoom, {
        event: 'bp:game:start',
        payload: {
          roomId
        }
      });
      setTimeout(() => {
        if (roomEngines.has(roomId)) {
          gameEngine.startTurn();
          broadcastTurnStartedWithState(roomId, roomEngines, rooms, true);
        }
      }, 3000);
    }
  }, 1000);

  return { success: true };
}

export async function handleGameInput(
  playerId: string,
  roomId: string,
  word: string,
  msTaken: number,
  roomEngines: Map<string, BombPartyEngine>,
  rooms: Map<string, Room>
): Promise<GameInputResult> {
  try {
    if (!validatePlayerId(playerId)) {
      return { success: false, error: 'Invalid player ID' };
    }

    if (!validateRoomId(roomId)) {
      return { success: false, error: 'Invalid room ID' };
    }

    const room = rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (!isPlayerInRoom(room, playerId)) {
      return { success: false, error: 'Player not in room' };
    }

    const engine = roomEngines.get(roomId);
    if (!engine) {
      bombPartyLogger.warn({ roomId, playerId }, 'Game not found in handleGameInput');
      return { success: false, error: 'Game not found' };
    }

    const state = engine.getState();
    if (!isCurrentPlayer(state, playerId)) {
      bombPartyLogger.warn({ roomId, playerId, currentPlayerId: state.currentPlayerId }, 'Not player turn in handleGameInput');
      return { success: false, error: 'Not your turn' };
    }

    const sanitizedWord = sanitizeWord(word);
    if (sanitizedWord.length < 3) {
      return { success: false, error: 'Word too short' };
    }

    const msValidation = validateMsTaken(
      msTaken,
      state.turnStartedAt,
      state.turnDurationMs,
      playerId,
      roomId
    );

    if (!msValidation.valid) {
      bombPartyLogger.warn({
        playerId,
        roomId,
        msTaken,
        turnStartedAt: state.turnStartedAt,
        turnDurationMs: state.turnDurationMs,
        reason: msValidation.reason
      }, 'msTaken validation failed - rejecting submission');
      return {
        success: false,
        error: `Invalid time value: ${msValidation.reason || 'msTaken validation failed'}`
      };
    }

    const correctedMsTaken = msValidation.corrected || msTaken;

    if (msValidation.corrected && msValidation.corrected !== msTaken) {
      bombPartyLogger.info({
        playerId,
        roomId,
        originalMsTaken: msTaken,
        correctedMsTaken,
        reason: msValidation.reason,
        turnStartedAt: state.turnStartedAt,
        realTime: Date.now() - state.turnStartedAt
      }, 'msTaken corrected by server (source of truth)');
    }

    const result = engine.submitWord(sanitizedWord, correctedMsTaken);
    if (result.ok) {
      engine.resolveTurn(true, false);
      broadcastTurnStartedWithState(roomId, roomEngines, rooms);
    } else if (result.consumedDoubleChance) {
      broadcastGameState(roomId, roomEngines, rooms);
    } else {
      engine.resolveTurn(false, false);
      broadcastTurnStartedWithState(roomId, roomEngines, rooms);
    }

    return { success: true };
  } catch (error) {
    bombPartyLogger.error({ roomId, playerId, error }, 'Error in handleGameInput');
    return { success: false, error: 'Internal server error processing game input' };
  }
}

export function handleActivateBonus(
  playerId: string,
  roomId: string,
  bonusKey: any,
  roomEngines: Map<string, BombPartyEngine>,
  rooms: Map<string, Room>
): ActivateBonusResult {
  try {
    if (!validatePlayerId(playerId)) {
      return { success: false, error: 'Invalid player ID' };
    }

    if (!validateRoomId(roomId)) {
      return { success: false, error: 'Invalid room ID' };
    }

    const room = rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (!isPlayerInRoom(room, playerId)) {
      return { success: false, error: 'Player not in room' };
    }

    const engine = roomEngines.get(roomId);
    if (!engine) {
      bombPartyLogger.warn({ roomId, playerId, bonusKey }, 'Game not found in handleActivateBonus');
      return { success: false, error: 'Game not found' };
    }

    const state = engine.getState();
    const bonusCheck = canActivateBonus(state, playerId, bonusKey);
    if (!bonusCheck.allowed) {
      bombPartyLogger.warn({ roomId, playerId, bonusKey, reason: bonusCheck.reason }, 'Cannot activate bonus');
      return { success: false, error: bonusCheck.reason || 'Cannot activate bonus' };
    }

    const result = engine.activateBonus(playerId, bonusKey);
    if (result.ok) {
      const room = rooms.get(roomId);
      if (!room) {
        bombPartyLogger.warn({ roomId, playerId }, 'Room not found when broadcasting bonus');
        return { success: false, error: 'Room not found' };
      }
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
  } catch (error) {
    bombPartyLogger.error({ roomId, playerId, bonusKey, error }, 'Error in handleActivateBonus');
    return { success: false, error: 'Internal server error activating bonus' };
  }
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
    const isHost = room?.hostId === playerId;
    const hasGameInProgress = !!engine;

    if (room) {
      const wasCurrentPlayer = engine?.getCurrentPlayer()?.id === playerId;
      room.players.delete(playerId);

    
    
      if (isHost && !hasGameInProgress && room.players.size > 0) {
      
        const remainingPlayers = Array.from(room.players.keys()).filter(id => id !== playerId);
        
      
      
        broadcastToRoom(room, {
          event: 'bp:lobby:host_disconnected',
          payload: {
            roomId: player.roomId,
            hostName: player.name,
            reason: 'host_disconnected'
          }
        }, [playerId]);

      
        for (const remainingPlayerId of remainingPlayers) {
          const remainingPlayer = players.get(remainingPlayerId);
          if (remainingPlayer) {
            remainingPlayer.roomId = undefined;
          }
          room.players.delete(remainingPlayerId);
        }

      
        room.players.clear();
        rooms.delete(player.roomId);
        if (roomEngines.has(player.roomId)) {
          roomEngines.delete(player.roomId);
        }

      
        player.roomId = undefined;

        return;
      }

    
    
      if (room.players.size > 0 && engine && wasCurrentPlayer) {
        engine.resolveTurn(false, true);
        broadcastGameState(player.roomId, roomEngines, rooms);

        if (engine.isGameOver()) {
          handleGameEnd(player.roomId, roomEngines, rooms);
        } else {
          const aliveCount = engine.getAlivePlayersCount();
          if (aliveCount < 2) {
            handleGameEnd(player.roomId, roomEngines, rooms);
          }
        }
      } else if (room.players.size === 0) {
        cleanupEmptyRoom(room, player.roomId, rooms, roomEngines);
      } else if (engine && !wasCurrentPlayer) {
        broadcastGameState(player.roomId, roomEngines, rooms);
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
  room.lastGameState = undefined;
  if (room.players.size === 0) {
    rooms.delete(roomId);
  }
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
    event: 'bp:turn:started',
    payload: {
      roomId,
      ...event
    }
  });
}

export function broadcastTurnStartedWithState(
  roomId: string,
  roomEngines: Map<string, BombPartyEngine>,
  rooms: Map<string, Room>,
  forceFull: boolean = false
): void {
  const engine = roomEngines.get(roomId);
  const room = rooms.get(roomId);
  if (!engine || !room) return;

  const turnEvent = engine.getTurnStartedEvent();
  const currentState = engine.getState();
  const prevState = room.lastGameState;

  incrementRoomState(room);

  let winner: any = undefined;
  if (currentState.phase === 'GAME_OVER') {
    winner = engine.getWinner();
  }
  const stateWithVersion = {
    ...currentState,
    winner: winner || undefined,
    stateVersion: room.stateVersion,
    sequenceNumber: room.sequenceNumber
  };
  let payload: any;
  if (forceFull || !prevState) {
    payload = {
      roomId,
      gameState: stateWithVersion,
      full: true,
      sequenceNumber: room.sequenceNumber,
      stateVersion: room.stateVersion,
      turnStarted: turnEvent
    };
  } else {
    const delta = calculateStateDelta(prevState, currentState, winner);
    payload = {
      roomId,
      delta,
      full: delta.full || false,
      sequenceNumber: room.sequenceNumber,
      stateVersion: room.stateVersion,
      turnStarted: turnEvent
    };
    if (delta.full) {
      payload.gameState = stateWithVersion;
    }
  }

  if (typeof structuredClone !== 'undefined') {
    room.lastGameState = structuredClone(currentState);
  } else {
    room.lastGameState = JSON.parse(JSON.stringify(currentState));
  }
  broadcastToRoom(room, {
    event: 'bp:game:state',
    payload
  });
}

function calculateStateDelta(prevState: any, currentState: any, winner?: any): any {
  if (!prevState) {
    return { full: true, gameState: currentState };
  }

  const delta: any = { full: false };
  let changeCount = 0;
  if (prevState.phase !== currentState.phase) {
    delta.phase = currentState.phase;
    changeCount++;
  }
  const playerIndexChanged = prevState.currentPlayerIndex !== currentState.currentPlayerIndex;
  if (playerIndexChanged) {
    delta.currentPlayerIndex = currentState.currentPlayerIndex;
    delta.currentPlayerId = currentState.currentPlayerId;
    changeCount++;
  }
  if (prevState.currentSyllable !== currentState.currentSyllable) {
    delta.currentSyllable = currentState.currentSyllable;
    changeCount++;
  }
  if (prevState.players.length !== currentState.players.length) {
    delta.players = currentState.players;
    changeCount += 2;
  } else {
    const playerDeltas: any[] = [];

    for (let i = 0; i < currentState.players.length; i++) {
      const prev = prevState.players[i];
      const curr = currentState.players[i];

      if (!prev ||
        prev.lives !== curr.lives ||
        prev.isEliminated !== curr.isEliminated ||
        prev.streak !== curr.streak) {
        const bonusesChanged = prev.bonuses.inversion !== curr.bonuses.inversion ||
          prev.bonuses.plus5sec !== curr.bonuses.plus5sec ||
          prev.bonuses.vitesseEclair !== curr.bonuses.vitesseEclair ||
          prev.bonuses.doubleChance !== curr.bonuses.doubleChance ||
          prev.bonuses.extraLife !== curr.bonuses.extraLife;
        if (bonusesChanged || prev.lives !== curr.lives || prev.isEliminated !== curr.isEliminated) {
          playerDeltas.push({ index: i, player: curr });
          changeCount++;
        }
      }
    }
    if (playerDeltas.length > 0) {
      delta.players = playerDeltas;
    }
  }
  if (prevState.usedWords.length !== currentState.usedWords.length) {
    delta.usedWords = currentState.usedWords;
    delta.newWords = currentState.usedWords.slice(prevState.usedWords.length);
    changeCount++;
  }
  if (prevState.turnStartedAt !== currentState.turnStartedAt) {
    delta.turnStartedAt = currentState.turnStartedAt;
    changeCount++;
  }
  if (prevState.turnDurationMs !== currentState.turnDurationMs) {
    delta.turnDurationMs = currentState.turnDurationMs;
    changeCount++;
  }

  if (currentState.phase === 'GAME_OVER') {
    const currentWinner = winner !== undefined ? winner : currentState.winner;
    const prevWinner = prevState.winner;

    if (!prevWinner ||
      (currentWinner && prevWinner?.id !== currentWinner?.id) ||
      prevState.phase !== 'GAME_OVER') {
      delta.winner = currentWinner;
      changeCount++;
    }
  }

  if (changeCount > 3) {
    return { full: true, gameState: currentState };
  }

  return delta;
}

export function broadcastGameState(
  roomId: string,
  roomEngines: Map<string, BombPartyEngine>,
  rooms: Map<string, Room>,
  forceFull: boolean = false
): void {
  const engine = roomEngines.get(roomId);
  const room = rooms.get(roomId);
  if (!engine || !room) return;

  const currentState = engine.getState();
  const prevState = room.lastGameState;
  incrementRoomState(room);
  let winner: any = undefined;
  if (currentState.phase === 'GAME_OVER') {
    winner = engine.getWinner();
  }
  const stateWithVersion = {
    ...currentState,
    winner: winner || undefined,
    stateVersion: room.stateVersion,
    sequenceNumber: room.sequenceNumber
  };
  let payload: any;
  if (forceFull || !prevState) {
    payload = {
      roomId,
      gameState: stateWithVersion,
      full: true,
      sequenceNumber: room.sequenceNumber,
      stateVersion: room.stateVersion
    };
  } else {
    const delta = calculateStateDelta(prevState, currentState, winner);
    payload = {
      roomId,
      delta,
      full: delta.full || false,
      sequenceNumber: room.sequenceNumber,
      stateVersion: room.stateVersion
    };
    if (delta.full) {
      payload.gameState = stateWithVersion;
    }
  }

  if (typeof structuredClone !== 'undefined') {
    room.lastGameState = structuredClone(currentState);
  } else {
    room.lastGameState = JSON.parse(JSON.stringify(currentState));
  }
  broadcastToRoom(room, {
    event: 'bp:game:state',
    payload
  });
}
