import Fastify from "fastify";
import cors from "@fastify/cors";
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import * as http from 'http';

const fastify = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
    },
  },
});

fastify.register(cors, {
  origin: "http://localhost:5173",
});

// Store for sessions
const sessions = new Map<string, any>();
const rooms = new Map<string, any>();

// Simple trigram generator
function generateRandomTrigram(): string {
  const trigrams = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'oil', 'sit', 'try', 'use', 'war', 'end', 'why', 'let', 'put', 'say', 'she', 'too', 'use'];
  return trigrams[Math.floor(Math.random() * trigrams.length)];
}

// Test route
fastify.get("/", async () => {
  return { hello: "from bombparty server" };
});

// Start Fastify server first on port 3003
fastify.listen({ port: 3003, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🚀 Serveur HTTP démarré sur ${address}`);
});

// Create WebSocket server on the same port
const server = http.createServer();
const wss = new WebSocketServer({ 
  server,
  path: '/bombparty/ws'
});

// Add support for game WebSocket (for Pong)
const gameWss = new WebSocketServer({ 
  server,
  path: '/game/ws'
});

wss.on('connection', (ws) => {
  const sessionId = uuidv4();
  const session = {
    id: sessionId,
    playerId: null,
    playerName: null,
    roomId: null,
    authenticated: false,
    socket: ws
  };
  
  sessions.set(sessionId, session);
  
  console.log(`[BombParty] ✅ Nouvelle connexion WebSocket: ${sessionId}`);
  console.log(`[BombParty] 📡 Connexion établie avec succès`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`[BombParty] Message reçu de ${sessionId}:`, data);
      
      switch (data.event) {
        case 'bp:auth':
          handleAuth(session, data.payload);
          break;
        case 'bp:lobby:create':
          handleCreateLobby(session, data.payload);
          break;
        case 'bp:lobby:join':
          handleJoinLobby(session, data.payload);
          break;
        case 'bp:lobby:leave':
          handleLeaveLobby(session, data.payload);
          break;
        case 'bp:lobby:start':
          handleStartGame(session, data.payload);
          break;
        case 'bp:game:input':
          handleGameInput(session, data.payload);
          break;
        case 'bp:bonus:activate':
          handleActivateBonus(session, data.payload);
          break;
        default:
          console.log(`[BombParty] Événement non reconnu: ${data.event}`);
      }
    } catch (error) {
      console.error(`[BombParty] Erreur parsing message:`, error);
    }
  });
  
  ws.on('close', () => {
    console.log(`[BombParty] Connexion fermée: ${sessionId}`);
    sessions.delete(sessionId);
  });
});

// Handler for game WebSocket (Pong)
gameWss.on('connection', (ws) => {
  console.log(`[Game] ✅ Nouvelle connexion WebSocket Pong`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`[Game] Message reçu:`, data);
      
      // Simple echo for now - Pong can implement its own logic
      ws.send(JSON.stringify({
        type: 'echo',
        data: data
      }));
    } catch (error) {
      console.error(`[Game] Erreur parsing message:`, error);
    }
  });
  
  ws.on('close', () => {
    console.log(`[Game] Connexion Pong fermée`);
  });
  
  ws.on('error', (error) => {
    console.error(`[Game] Erreur WebSocket Pong:`, error);
  });
});

function handleAuth(session: any, payload: any) {
  const playerId = uuidv4();
  session.playerId = playerId;
  session.playerName = payload.playerName;
  session.authenticated = true;
  
  const response = {
    event: 'bp:auth:success',
    payload: { playerId }
  };
  
  session.socket.send(JSON.stringify(response));
  console.log(`[BombParty] Authentification réussie pour ${payload.playerName} (${playerId})`);
}

function handleCreateLobby(session: any, payload: any) {
  if (!session.authenticated) {
    sendError(session, 'Non authentifié');
    return;
  }
  
  const roomId = uuidv4();
  const room = {
    id: roomId,
    name: payload.name,
    isPrivate: payload.isPrivate,
    password: payload.password,
    maxPlayers: payload.maxPlayers || 4,
    hostId: session.playerId,
    players: [{
      id: session.playerId,
      name: session.playerName
    }],
    gameState: null
  };
  
  rooms.set(roomId, room);
  session.roomId = roomId;
  
  const response = {
    event: 'bp:lobby:created',
    payload: {
      roomId,
      maxPlayers: room.maxPlayers
    }
  };
  
  session.socket.send(JSON.stringify(response));
  console.log(`[BombParty] Lobby créé: ${roomId} par ${session.playerName}`);
}

function handleJoinLobby(session: any, payload: any) {
  if (!session.authenticated) {
    sendError(session, 'Non authentifié');
    return;
  }
  
  const room = rooms.get(payload.roomId);
  if (!room) {
    sendError(session, 'Lobby introuvable');
    return;
  }
  
  if (room.players.length >= room.maxPlayers) {
    sendError(session, 'Lobby plein');
    return;
  }
  
  if (room.isPrivate && room.password !== payload.password) {
    sendError(session, 'Mot de passe incorrect');
    return;
  }
  
  room.players.push({
    id: session.playerId,
    name: session.playerName
  });
  
  session.roomId = payload.roomId;
  
  const response = {
    event: 'bp:lobby:joined',
    payload: {
      roomId: payload.roomId,
      maxPlayers: room.maxPlayers,
      players: room.players
    }
  };
  
  session.socket.send(JSON.stringify(response));
  
  broadcastToRoom(payload.roomId, {
    event: 'bp:lobby:player_joined',
    payload: { players: room.players }
  });
  
  console.log(`[BombParty] ${session.playerName} a rejoint le lobby ${payload.roomId}`);
}

function handleLeaveLobby(session: any, payload: any) {
  if (!session.roomId) return;
  
  const room = rooms.get(session.roomId);
  if (room) {
    room.players = room.players.filter((p: any) => p.id !== session.playerId);
    
    if (room.players.length === 0) {
      rooms.delete(session.roomId);
    } else {
      broadcastToRoom(session.roomId, {
        event: 'bp:lobby:player_left',
        payload: { players: room.players }
      });
    }
  }
  
  session.roomId = null;
  console.log(`[BombParty] ${session.playerName} a quitté le lobby`);
}

function handleStartGame(session: any, payload: any) {
  const room = rooms.get(payload.roomId);
  if (!room || room.hostId !== session.playerId) {
    sendError(session, 'Pas autorisé à démarrer le jeu');
    return;
  }
  
  // Simulate game start
  const gameState = {
    phase: 'TURN_ACTIVE',
    players: room.players.map((p: any) => ({
      ...p,
      lives: 3,
      isEliminated: false,
      streak: 0,
      bonuses: {
        inversion: 0,
        plus5sec: 0,
        vitesseEclair: 0,
        doubleChance: 0,
        extraLife: 0
      }
    })),
    currentPlayerIndex: 0,
    currentPlayerId: room.players[0].id,
    currentTrigram: 'the',
    usedWords: [],
    turnStartedAt: Date.now(),
    turnDurationMs: 15000,
    turnOrder: room.players.map((p: any) => p.id),
    turnDirection: 1,
    baseTurnSeconds: 15,
    history: []
  };
  
  // Start timer for first turn
  setTimeout(() => {
    const currentRoom = rooms.get(payload.roomId);
    if (currentRoom && currentRoom.gameState.phase === 'TURN_ACTIVE') {
      // Timer expired - move to next player or end game
      console.log(`[BombParty] ⏰ Timer expiré pour le tour dans ${payload.roomId}`);
      
      const currentPlayer = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];
      if (currentPlayer) {
        console.log(`[BombParty] ⏰ ${currentPlayer.name} a perdu une vie (timeout)`);
        
        // Reduce player lives
        currentPlayer.lives -= 1;
        currentPlayer.isEliminated = currentPlayer.lives <= 0;
        
        // Check if game is over
        const alivePlayers = currentRoom.gameState.players.filter((p: any) => !p.isEliminated);
        if (alivePlayers.length <= 1) {
          currentRoom.gameState.phase = 'GAME_OVER';
          currentRoom.gameState.winner = alivePlayers[0] || null;
          
          const endResponse = {
            event: 'bp:game:end',
            payload: { 
              winner: currentRoom.gameState.winner,
              finalStats: currentRoom.gameState.players
            }
          };
          broadcastToRoom(payload.roomId, endResponse);
        } else {
          currentRoom.gameState.currentPlayerIndex = (currentRoom.gameState.currentPlayerIndex + 1) % currentRoom.gameState.players.length;
          currentRoom.gameState.currentPlayerId = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex].id;
          currentRoom.gameState.turnStartedAt = Date.now();
          
          const nextTurnResponse = {
            event: 'bp:game:state',
            payload: { gameState: currentRoom.gameState }
          };
          broadcastToRoom(payload.roomId, nextTurnResponse);
          
          // Restart timer for next turn
          setTimeout(() => {
            const room = rooms.get(payload.roomId);
            if (room && room.gameState.phase === 'TURN_ACTIVE') {
              console.log(`[BombParty] ⏰ Timer expiré pour le tour suivant dans ${payload.roomId}`);
              // Repeat end of turn logic
            }
          }, gameState.turnDurationMs);
        }
      }
    }
  }, gameState.turnDurationMs);
  
  room.gameState = gameState;
  
  const response = {
    event: 'bp:game:state',
    payload: { gameState }
  };
  
  broadcastToRoom(payload.roomId, response);
  console.log(`[BombParty] Jeu démarré dans le lobby ${payload.roomId}`);
}

function handleGameInput(session: any, payload: any) {
  const room = rooms.get(session.roomId);
  if (!room || !room.gameState) {
    sendError(session, 'Aucune partie en cours');
    return;
  }
  
  const gameState = room.gameState;
  
  if (gameState.currentPlayerId !== session.playerId) {
    sendError(session, 'Ce n\'est pas votre tour');
    return;
  }
  
  if (gameState.phase !== 'TURN_ACTIVE') {
    sendError(session, 'Aucun tour actif');
    return;
  }
  
  const currentTrigram = gameState.currentTrigram.toLowerCase();
  const word = payload.word.toLowerCase();
  const isValid = word.includes(currentTrigram) && !gameState.usedWords.includes(word);
  
  console.log(`[BombParty] Validation mot "${word}" avec trigramme "${currentTrigram}": ${isValid ? 'VALIDE' : 'INVALIDE'}`);
  
  if (isValid) {
    gameState.usedWords.push(word);
    
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    gameState.currentPlayerId = gameState.players[gameState.currentPlayerIndex].id;
    gameState.turnStartedAt = Date.now();
    
    gameState.currentTrigram = generateRandomTrigram();
    
    console.log(`[BombParty] ✅ Mot valide! Nouveau trigramme: ${gameState.currentTrigram}`);
    
    const wordResult = {
      event: 'bp:game:word_result',
      payload: {
        playerId: session.playerId,
        word: payload.word,
        valid: true,
        msTaken: payload.msTaken,
        newTrigram: gameState.currentTrigram
      }
    };
    
    const gameStateUpdate = {
      event: 'bp:game:state',
      payload: { gameState }
    };
    
    broadcastToRoom(session.roomId, wordResult);
    broadcastToRoom(session.roomId, gameStateUpdate);
    
    setTimeout(() => {
      const currentRoom = rooms.get(session.roomId);
      if (currentRoom && currentRoom.gameState.phase === 'TURN_ACTIVE') {
        console.log(`[BombParty] ⏰ Timer expiré pour le tour dans ${session.roomId}`);
        
        const currentPlayer = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex];
        if (currentPlayer) {
          console.log(`[BombParty] ⏰ ${currentPlayer.name} a perdu une vie (timeout)`);
          
          currentPlayer.lives -= 1;
          currentPlayer.isEliminated = currentPlayer.lives <= 0;
          
          const alivePlayers = currentRoom.gameState.players.filter((p: any) => !p.isEliminated);
          if (alivePlayers.length <= 1) {
            currentRoom.gameState.phase = 'GAME_OVER';
            currentRoom.gameState.winner = alivePlayers[0] || null;
            
            const endResponse = {
              event: 'bp:game:end',
              payload: { 
                winner: currentRoom.gameState.winner,
                finalStats: currentRoom.gameState.players
              }
            };
            broadcastToRoom(session.roomId, endResponse);
          } else {
            currentRoom.gameState.currentPlayerIndex = (currentRoom.gameState.currentPlayerIndex + 1) % currentRoom.gameState.players.length;
            currentRoom.gameState.currentPlayerId = currentRoom.gameState.players[currentRoom.gameState.currentPlayerIndex].id;
            currentRoom.gameState.turnStartedAt = Date.now();
            
            const nextTurnResponse = {
              event: 'bp:game:state',
              payload: { gameState: currentRoom.gameState }
            };
            broadcastToRoom(session.roomId, nextTurnResponse);
          }
        }
      }
    }, gameState.turnDurationMs);
    
  } else {
    const currentPlayer = gameState.players.find((p: any) => p.id === session.playerId);
    if (currentPlayer) {
      currentPlayer.lives -= 1;
      currentPlayer.isEliminated = currentPlayer.lives <= 0;
      
      console.log(`[BombParty] ❌ Mot invalide! ${currentPlayer.name} perd une vie (${currentPlayer.lives} restantes)`);
      
      const alivePlayers = gameState.players.filter((p: any) => !p.isEliminated);
      if (alivePlayers.length <= 1) {
        gameState.phase = 'GAME_OVER';
        gameState.winner = alivePlayers[0] || null;
        
        const endResponse = {
          event: 'bp:game:end',
          payload: { 
            winner: gameState.winner,
            finalStats: gameState.players
          }
        };
        broadcastToRoom(session.roomId, endResponse);
        return;
      }
      
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
      gameState.currentPlayerId = gameState.players[gameState.currentPlayerIndex].id;
      gameState.turnStartedAt = Date.now();
      gameState.currentTrigram = generateRandomTrigram();
      
      const wordResult = {
        event: 'bp:game:word_result',
        payload: {
          playerId: session.playerId,
          word: payload.word,
          valid: false,
          msTaken: payload.msTaken,
          newTrigram: gameState.currentTrigram
        }
      };
      
      const gameStateUpdate = {
        event: 'bp:game:state',
        payload: { gameState }
      };
      
      broadcastToRoom(session.roomId, wordResult);
      broadcastToRoom(session.roomId, gameStateUpdate);
    }
  }
  
  console.log(`[BombParty] Mot soumis par ${session.playerName}: ${payload.word}`);
}

function handleActivateBonus(session: any, payload: any) {
  const response = {
    event: 'bp:bonus:applied',
    payload: {
      playerId: session.playerId,
      bonusKey: payload.bonusKey,
      appliedAt: Date.now()
    }
  };
  
  session.socket.send(JSON.stringify(response));
  console.log(`[BombParty] Bonus activé par ${session.playerName}: ${payload.bonusKey}`);
}

function sendError(session: any, message: string) {
  const response = {
    event: 'bp:error',
    payload: { message }
  };
  
  session.socket.send(JSON.stringify(response));
}

function broadcastToRoom(roomId: string, message: any) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  for (const session of Array.from(sessions.values())) {
    if (session.roomId === roomId) {
      session.socket.send(JSON.stringify(message));
    }
  }
}

// Start WebSocket server on port 3002 to avoid conflict
const WS_PORT = 3002;
server.listen(WS_PORT, () => {
  console.log(`🎮 Serveur WebSocket démarré sur le port ${WS_PORT}`);
  console.log(`🎮 WebSocket Bomb Party: ws://localhost:${WS_PORT}/bombparty/ws`);
  console.log(`🎮 WebSocket Pong: ws://localhost:${WS_PORT}/game/ws`);
});
