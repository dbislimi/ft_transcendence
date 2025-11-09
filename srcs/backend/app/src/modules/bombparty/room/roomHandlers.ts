import { BombPartyEngine } from '../GameEngine.ts';
import { v4 as uuidv4 } from 'uuid';
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
  cleanupEmptyRoom
} from './roomUtils.ts';

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

  const roomId = uuidv4();
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

  // Notifier le nouveau joueur qu'il a rejoint
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
  }, []);

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
    return { success: false, error: 'Player not found' };
  }

  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  if (player.roomId !== roomId) {
    return { success: false, error: 'Not in this room' };
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
  console.log('[BombParty DEBUG] ========== handleStartGame() CALLED ==========');
  console.log('[BombParty DEBUG] roomId:', roomId, 'playerId:', playerId);
  
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
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

  // Don't broadcast incomplete state here - wait for startTurn() to initialize everything
  // The first complete state will be sent after startTurn() completes

  // Envoyer l'événement bp:game:countdown pour démarrer le compte à rebours
  const countdownStartTime = Date.now();
  const countdownDuration = 3000; // 3 secondes
  
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
      
      // Envoyer l'événement bp:game:start pour indiquer que le jeu démarre
      broadcastToRoom(currentRoom, {
        event: 'bp:game:start',
        payload: {
          roomId
        }
      });
      
      setTimeout(() => {
        if (roomEngines.has(roomId)) {
          gameEngine.startTurn();
          broadcastTurnStarted(roomId, roomEngines, rooms);
          // First broadcast with complete state happens here (forceFull = true)
          broadcastGameState(roomId, roomEngines, rooms, true);
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
    return { success: false, error: 'Game not found' };
  }

  const currentPlayer = engine.getCurrentPlayer();
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return { success: false, error: 'Not your turn' };
  }

  const result = engine.submitWord(word, msTaken);
  
  if (result.ok) {
    // mot valide : resoudre le tour et passer au suivant
    engine.resolveTurn(true, false);
    broadcastTurnStarted(roomId, roomEngines, rooms);
    broadcastGameState(roomId, roomEngines, rooms);
  } else if (result.consumedDoubleChance) {
    // double chance consommee : ne pas resoudre le tour, le joueur peut reessayer
    // ne pas appeler resolveTurn ni broadcastTurnStarted
    // juste mettre a jour l'etat pour informer que le bonus a ete consomme
    broadcastGameState(roomId, roomEngines, rooms);
  } else {
    // mot invalide sans double chance : resoudre le tour et passer au suivant
    engine.resolveTurn(false, false);
    broadcastTurnStarted(roomId, roomEngines, rooms);
    broadcastGameState(roomId, roomEngines, rooms);
  }

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
    return { success: false, error: 'Game not found' };
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
      const wasCurrentPlayer = engine?.getCurrentPlayer()?.id === playerId;
      room.players.delete(playerId);
      
      // Si c'était le joueur actuel et qu'il reste des joueurs, résoudre le tour
      if (room.players.size > 0 && engine && wasCurrentPlayer) {
        // Résoudre le tour comme échoué (timeout)
        engine.resolveTurn(false, true);
        broadcastGameState(player.roomId, roomEngines, rooms);
        
        // Vérifier si la partie est terminée
        if (engine.isGameOver()) {
          handleGameEnd(player.roomId, roomEngines, rooms);
        } else {
          // Si la partie continue, s'assurer qu'il y a encore des joueurs vivants
          const aliveCount = engine.getAlivePlayersCount();
          if (aliveCount < 2) {
            // Plus assez de joueurs, terminer la partie
            handleGameEnd(player.roomId, roomEngines, rooms);
          }
        }
      } else if (room.players.size === 0) {
        // Plus de joueurs dans la room, nettoyer complètement
        cleanupEmptyRoom(room, player.roomId, rooms, roomEngines);
      } else if (engine && !wasCurrentPlayer) {
        // Le joueur déconnecté n'était pas le joueur actuel, juste mettre à jour l'état
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

  // Nettoyage explicite du roomEngine et de l'état pour éviter les fuites mémoire
  roomEngines.delete(roomId);
  room.startedAt = undefined;
  room.lastGameState = undefined; // Nettoyer l'état précédent
  
  // Réinitialiser l'état de la room pour permettre une nouvelle partie
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
  // Utiliser le préfixe bp: pour la cohérence avec les autres événements
  broadcastToRoom(room, {
    event: 'bp:turn:started',
    payload: {
      roomId,
      ...event
    }
  });
}

// Calcule les différences entre deux états de jeu pour créer un delta
function calculateStateDelta(prevState: any, currentState: any): any {
  if (!prevState) {
    // Premier état, envoyer tout
    return { full: true, gameState: currentState };
  }

  const delta: any = { full: false };
  
  // Comparer les champs principaux
  if (prevState.phase !== currentState.phase) {
    delta.phase = currentState.phase;
  }
  
  if (prevState.currentPlayerIndex !== currentState.currentPlayerIndex) {
    delta.currentPlayerIndex = currentState.currentPlayerIndex;
    delta.currentPlayerId = currentState.currentPlayerId;
  }
  
  if (prevState.currentSyllable !== currentState.currentSyllable) {
    delta.currentSyllable = currentState.currentSyllable;
  }
  
  // Comparer les joueurs (vies, élimination, streak, bonus)
  if (prevState.players.length !== currentState.players.length) {
    delta.players = currentState.players;
  } else {
    const playerDeltas: any[] = [];
    let hasPlayerChanges = false;
    
    for (let i = 0; i < currentState.players.length; i++) {
      const prev = prevState.players[i];
      const curr = currentState.players[i];
      
      if (!prev || 
          prev.lives !== curr.lives ||
          prev.isEliminated !== curr.isEliminated ||
          prev.streak !== curr.streak ||
          JSON.stringify(prev.bonuses) !== JSON.stringify(curr.bonuses)) {
        playerDeltas.push({ index: i, player: curr });
        hasPlayerChanges = true;
      }
    }
    
    if (hasPlayerChanges) {
      delta.players = playerDeltas;
    }
  }
  
  // Comparer les mots utilisés
  if (prevState.usedWords.length !== currentState.usedWords.length) {
    delta.usedWords = currentState.usedWords;
    delta.newWords = currentState.usedWords.slice(prevState.usedWords.length);
  }
  
  // Comparer l'historique
  if (prevState.history.length !== currentState.history.length) {
    delta.history = currentState.history.slice(prevState.history.length);
  }
  
  // Comparer les timers
  if (prevState.turnStartedAt !== currentState.turnStartedAt) {
    delta.turnStartedAt = currentState.turnStartedAt;
  }
  
  if (prevState.turnDurationMs !== currentState.turnDurationMs) {
    delta.turnDurationMs = currentState.turnDurationMs;
  }
  
  // Si trop de changements, envoyer l'état complet
  const deltaKeys = Object.keys(delta).filter(k => k !== 'full');
  if (deltaKeys.length > 5) {
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
  
  // Calculer le delta ou envoyer l'état complet
  let payload: any;
  if (forceFull || !prevState) {
    // Premier état ou forcer l'état complet
    payload = {
      roomId,
      gameState: currentState,
      full: true
    };
  } else {
    // Envoyer seulement les changements
    const delta = calculateStateDelta(prevState, currentState);
    payload = {
      roomId,
      delta,
      full: delta.full || false
    };
    
    // Si c'est un delta complet, inclure l'état pour compatibilité
    if (delta.full) {
      payload.gameState = currentState;
    }
  }
  
  // Stocker l'état actuel pour la prochaine comparaison
  room.lastGameState = JSON.parse(JSON.stringify(currentState));
  
  console.log(`[BombParty DEBUG] broadcastGameState -> currentSyllable=${currentState.currentSyllable}, delta=${!forceFull && prevState ? 'yes' : 'no'}`);
  
  broadcastToRoom(room, {
    event: 'bp:game:state',
    payload
  });
}
