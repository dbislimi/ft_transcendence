/**
 * Serveur Bomb Party simplifié
 * 
 * Version minimale pour tester la création de lobby
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: "pino-pretty",
    },
  },
});

// Configuration CORS
fastify.register(cors, {
  origin: true,
  credentials: true
});

// Configuration WebSocket
fastify.register(websocket);

// Gestionnaire WebSocket pour Bomb Party
fastify.register(async function (fastify) {
  fastify.get('/bombparty/ws', { websocket: true }, (connection, req) => {
    console.log('🔌 [BombParty] Nouvelle connexion WebSocket');

    connection.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('📨 [BombParty] Message reçu:', data);

        switch (data.event) {
          case 'bp:auth':
            handleAuth(connection, data.payload);
            break;
          case 'bp:lobby:create':
            handleLobbyCreate(connection, data.payload);
            break;
          case 'bp:lobby:join':
            handleLobbyJoin(connection, data.payload);
            break;
          case 'bp:lobby:start':
            handleLobbyStart(connection, data.payload);
            break;
          case 'bp:game:input':
            handleGameInput(connection, data.payload);
            break;
          case 'bp:bonus:activate':
            handleBonusActivate(connection, data.payload);
            break;
          default:
            sendError(connection, `Event non supporté: ${data.event}`, 'UNSUPPORTED_EVENT');
        }
      } catch (err) {
        console.error('❌ [BombParty] Erreur parsing message:', err);
        sendError(connection, 'Message invalide', 'INVALID_MESSAGE');
      }
    });

    connection.on('close', () => {
      console.log('❌ [BombParty] Connexion fermée');
    });
  });
});

function handleAuth(connection: any, payload: any) {
  const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('✅ [BombParty] Authentification:', playerId);
  
  sendMessage(connection, {
    event: 'bp:auth:success',
    payload: {
      playerId,
      playerName: payload.playerName || 'Player'
    }
  });
}

function handleLobbyCreate(connection: any, payload: any) {
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('🏠 [BombParty] Lobby créé:', roomId);
  
  sendMessage(connection, {
    event: 'bp:lobby:created',
    payload: {
      roomId,
      name: payload.name || 'Lobby',
      isPrivate: payload.isPrivate || false
    }
  });
}

function handleLobbyJoin(connection: any, payload: any) {
  console.log('🚪 [BombParty] Rejoindre lobby:', payload.roomId);
  
  sendMessage(connection, {
    event: 'bp:lobby:joined',
    payload: {
      roomId: payload.roomId,
      players: [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ]
    }
  });
}

function handleLobbyStart(connection: any, payload: any) {
  console.log('🎮 [BombParty] Démarrage du jeu:', payload.roomId);
  
  const gameState = {
    phase: 'TURN_ACTIVE',
    players: [
      { id: 'player1', name: 'Player 1', lives: 3, isEliminated: false, streak: 0, bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 } },
      { id: 'player2', name: 'Player 2', lives: 3, isEliminated: false, streak: 0, bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 } }
    ],
    currentPlayerIndex: 0,
    currentTrigram: 'CHA',
    usedWords: [],
    turnEndsAt: Date.now() + 15000,
    turnOrder: ['player1', 'player2'],
    turnDirection: 1,
    baseTurnSeconds: 15,
    history: []
  };
  
  sendMessage(connection, {
    event: 'bp:game:state',
    payload: {
      roomId: payload.roomId,
      gameState
    }
  });
}

function handleGameInput(connection: any, payload: any) {
  console.log('🎯 [BombParty] Mot soumis:', payload.word);
  
  // Simuler une validation simple
  const isValid = payload.word.toLowerCase().includes('cha') && payload.word.length >= 3;
  
  sendMessage(connection, {
    event: 'bp:game:state',
    payload: {
      roomId: payload.roomId,
      gameState: {
        phase: 'RESOLVE',
        players: [
          { id: 'player1', name: 'Player 1', lives: 3, isEliminated: false, streak: 0, bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 } },
          { id: 'player2', name: 'Player 2', lives: 3, isEliminated: false, streak: 0, bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 } }
        ],
        currentPlayerIndex: 1,
        currentTrigram: 'CHA',
        usedWords: [payload.word.toLowerCase()],
        turnEndsAt: Date.now() + 15000,
        turnOrder: ['player1', 'player2'],
        turnDirection: 1,
        baseTurnSeconds: 15,
        history: [
          { playerId: 'player1', word: payload.word, ok: isValid, msTaken: payload.msTaken || 0 }
        ]
      }
    }
  });
}

function handleBonusActivate(connection: any, payload: any) {
  console.log('🎁 [BombParty] Bonus activé:', payload.bonusKey);
  
  sendMessage(connection, {
    event: 'bp:bonus:applied',
    payload: {
      roomId: payload.roomId,
      bonusKey: payload.bonusKey,
      appliedAt: Date.now()
    }
  });
}

// Fonctions utilitaires
function sendMessage(connection: any, message: any) {
  if (connection.readyState === 1) { // WebSocket.OPEN
    connection.send(JSON.stringify(message));
  }
}

function sendError(connection: any, message: string, code: string) {
  sendMessage(connection, {
    event: 'bp:error',
    payload: {
      message,
      code
    }
  });
}

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 [BombParty] Serveur démarré sur http://localhost:3000');
    console.log('🔌 [BombParty] WebSocket disponible sur ws://localhost:3000/bombparty/ws');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
