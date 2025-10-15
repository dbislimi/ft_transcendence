import { BombPartyEngine } from '../GameEngine';
import { broadcastToRoom, getPlayersList, validateRoomJoin, validateRoomCreation, validateGameStart, cleanupEmptyRoom } from './roomUtils';
export function handleTurnStarted(roomId, roomEngines, rooms) {
    const engine = roomEngines.get(roomId);
    const room = rooms.get(roomId);
    if (!engine || !room)
        return;
    const turnStartedEvent = engine.getTurnStartedEvent();
    broadcastToRoom(room, {
        event: 'bp:turn:started',
        payload: turnStartedEvent
    });
}
export function handleGameStateSync(roomId, roomEngines, rooms) {
    const engine = roomEngines.get(roomId);
    const room = rooms.get(roomId);
    if (!engine || !room)
        return;
    const gameStateEvent = engine.getGameStateSyncEvent();
    broadcastToRoom(room, gameStateEvent);
}
export function handleAuthoritativeTurnEnd(roomId, roomEngines, rooms) {
    const engine = roomEngines.get(roomId);
    const room = rooms.get(roomId);
    if (!engine || !room)
        return false;
    if (engine.isTurnExpired()) {
        engine.checkAndEndExpiredTurn();
        if (engine.isGameOver()) {
            const winner = engine.getWinner();
            const finalStats = engine.getFinalStats();
            broadcastToRoom(room, {
                event: 'bp:game:end',
                payload: {
                    roomId,
                    winner: winner ? { id: winner.id, name: winner.name } : undefined,
                    finalStats
                }
            });
            roomEngines.delete(roomId);
            return true;
        }
        else {
            handleTurnStarted(roomId, roomEngines, rooms);
            handleGameStateSync(roomId, roomEngines, rooms);
        }
    }
    return false;
}
export function handleCreateRoom(creatorId, roomName, isPrivate, password, maxPlayers, players, rooms) {
    const creator = players.get(creatorId);
    const validation = validateRoomCreation(creator, maxPlayers);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }
    const roomId = require('uuid').v4();
    const room = {
        id: roomId,
        name: roomName,
        isPrivate,
        password,
        maxPlayers: validation.validMaxPlayers,
        players: new Map(),
        createdAt: Date.now()
    };
    room.players.set(creatorId, {
        id: creatorId,
        name: creator.name,
        ws: creator.ws
    });
    creator.roomId = roomId;
    rooms.set(roomId, room);
    return { success: true, roomId, maxPlayers: validation.validMaxPlayers };
}
export function handleJoinRoom(playerId, roomId, password, players, rooms) {
    const player = players.get(playerId);
    const room = rooms.get(roomId);
    const validation = validateRoomJoin(player, room, password);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }
    room.players.set(playerId, {
        id: playerId,
        name: player.name,
        ws: player.ws
    });
    player.roomId = roomId;
    const playersList = getPlayersList(room);
    broadcastToRoom(room, {
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
export function handleLeaveRoom(playerId, roomId, players, rooms, roomEngines) {
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
export function handleStartGame(playerId, roomId, rooms, roomEngines) {
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
export function handleGameInput(playerId, roomId, word, msTaken, roomEngines, rooms) {
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
    }
    else {
        engine.resolveTurn(false, false);
        broadcastTurnStarted(roomId, roomEngines, rooms);
    }
    broadcastGameState(roomId, roomEngines, rooms);
    return { success: true };
}
export function handleActivateBonus(playerId, roomId, bonusKey, roomEngines, rooms) {
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
export function handlePlayerDisconnect(playerId, players, rooms, roomEngines) {
    const player = players.get(playerId);
    if (!player)
        return;
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
export function handleGameEnd(roomId, roomEngines, rooms) {
    const engine = roomEngines.get(roomId);
    const room = rooms.get(roomId);
    if (!engine || !room)
        return;
    const winner = engine.getWinner();
    const finalStats = engine.getFinalStats();
    const endMessage = {
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
export function broadcastTurnStarted(roomId, roomEngines, rooms) {
    const engine = roomEngines.get(roomId);
    const room = rooms.get(roomId);
    if (!engine || !room)
        return;
    const event = engine.getTurnStartedEvent();
    broadcastToRoom(room, {
        event: 'turn_started',
        payload: event
    });
}
export function broadcastGameState(roomId, roomEngines, rooms) {
    const engine = roomEngines.get(roomId);
    const room = rooms.get(roomId);
    if (!engine || !room)
        return;
    const event = engine.getGameStateSyncEvent();
    broadcastToRoom(room, {
        event: 'game_state',
        payload: event
    });
}
