/**
 * Serveur Bomb Party simplifié en JavaScript
 */

const WebSocket = require('ws');
const http = require('http');

// Créer un serveur HTTP
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bomb Party Server is running!');
});

// Créer un serveur WebSocket
const wss = new WebSocket.Server({ 
  server,
  path: '/bombparty/ws'
});

// Stockage des lobbies et joueurs
const lobbies = new Map(); // roomId -> lobby
const players = new Map(); // playerId -> player
const gameTimers = new Map(); // roomId -> timer
const gameStates = new Map(); // roomId -> gameState

// Charger les trigrammes depuis le fichier JSON
const fs = require('fs');
const path = require('path');

let TRIGRAMS = [];
let TRIGRAM_WORDS = {};
try {
  const trigramData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../frontend/app/src/game-bomb-party/data/trigram_words.json'), 'utf8'));
  TRIGRAMS = Object.keys(trigramData).map(key => key.toUpperCase());
  TRIGRAM_WORDS = trigramData;
  console.log('📚 [BombParty] Trigrammes chargés:', TRIGRAMS.length, 'trigrammes disponibles');
} catch (error) {
  console.error('❌ [BombParty] Erreur lors du chargement des trigrammes:', error.message);
  // Fallback vers une liste de base
  TRIGRAMS = ['CHA', 'TRE', 'BLE', 'QUE', 'TION', 'MENT', 'ABLE', 'IBLE', 'EUR', 'EUSE', 'ISME', 'ISTE', 'IQUE', 'EURE'];
  TRIGRAM_WORDS = {};
}

console.log('🚀 [BombParty] Serveur démarré sur http://localhost:3002');
console.log('🔌 [BombParty] WebSocket disponible sur ws://localhost:3002/bombparty/ws');

wss.on('connection', (ws) => {
  console.log('🔌 [BombParty] Nouvelle connexion WebSocket');
  
  // Associer le WebSocket à un joueur temporaire
  ws.playerId = null;
  ws.roomId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 [BombParty] Message reçu:', data);
      console.log('📨 [BombParty] Player ID:', ws.playerId, 'Room ID:', ws.roomId);

      switch (data.event) {
        case 'bp:auth':
          handleAuth(ws, data.payload);
          break;
        case 'bp:lobby:create':
          handleLobbyCreate(ws, data.payload);
          break;
        case 'bp:lobby:join':
          handleLobbyJoin(ws, data.payload);
          break;
        case 'bp:lobby:start':
          handleLobbyStart(ws, data.payload);
          break;
        case 'bp:game:input':
          handleGameInput(ws, data.payload);
          break;
        case 'bp:bonus:activate':
          handleBonusActivate(ws, data.payload);
          break;
        default:
          sendError(ws, `Event non supporté: ${data.event}`, 'UNSUPPORTED_EVENT');
      }
    } catch (err) {
      console.error('❌ [BombParty] Erreur parsing message:', err);
      sendError(ws, 'Message invalide', 'INVALID_MESSAGE');
    }
  });

  ws.on('close', () => {
    console.log('❌ [BombParty] Connexion fermée');
    if (ws.playerId) {
      handlePlayerDisconnect(ws);
    }
  });
});

// Gestionnaires d'événements
function handleAuth(ws, payload) {
  const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const playerName = payload.playerName || 'Player';
  
  console.log('✅ [BombParty] Authentification:', playerId, playerName);
  
  // Stocker le joueur
  const player = {
    id: playerId,
    name: playerName,
    ws: ws,
    roomId: null
  };
  
  players.set(playerId, player);
  ws.playerId = playerId;
  
  sendMessage(ws, {
    event: 'bp:auth:success',
    payload: {
      playerId,
      playerName
    }
  });
}

function handleLobbyCreate(ws, payload) {
  if (!ws.playerId) {
    sendError(ws, 'Joueur non authentifié', 'NOT_AUTHENTICATED');
    return;
  }
  
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const player = players.get(ws.playerId);
  
  console.log('🏠 [BombParty] Lobby créé:', roomId, 'par', player.name);
  console.log('🏠 [BombParty] Payload reçu:', payload);
  console.log('🏠 [BombParty] maxPlayers dans payload:', payload.maxPlayers);
  
  // Créer le lobby
  const lobby = {
    id: roomId,
    name: payload.name || 'Lobby',
    isPrivate: payload.isPrivate || false,
    password: payload.password,
    maxPlayers: payload.maxPlayers || 4,
    players: new Map(),
    createdAt: Date.now(),
    isStarted: false
  };
  
  console.log('🏠 [BombParty] Lobby configuré avec maxPlayers:', lobby.maxPlayers);
  
  // Ajouter le créateur au lobby
  lobby.players.set(ws.playerId, player);
  player.roomId = roomId;
  ws.roomId = roomId;
  
  lobbies.set(roomId, lobby);
  
  sendMessage(ws, {
    event: 'bp:lobby:created',
    payload: {
      roomId,
      name: lobby.name,
      isPrivate: lobby.isPrivate,
      maxPlayers: lobby.maxPlayers
    }
  });
  
  // Notifier que le joueur a rejoint (sauf au créateur)
  broadcastToLobby(roomId, {
    event: 'bp:lobby:joined',
    payload: {
      roomId,
      playerId: ws.playerId,
      maxPlayers: lobby.maxPlayers,
      players: Array.from(lobby.players.values()).map(p => ({
        id: p.id,
        name: p.name
      }))
    }
  }, ws.playerId); // Exclure le créateur
}

function handleLobbyJoin(ws, payload) {
  if (!ws.playerId) {
    sendError(ws, 'Joueur non authentifié', 'NOT_AUTHENTICATED');
    return;
  }
  
  const lobby = lobbies.get(payload.roomId);
  if (!lobby) {
    sendError(ws, 'Lobby non trouvé', 'LOBBY_NOT_FOUND');
    return;
  }
  
  if (lobby.isStarted) {
    sendError(ws, 'Le lobby a déjà commencé', 'LOBBY_STARTED');
    return;
  }
  
  if (lobby.players.size >= lobby.maxPlayers) {
    sendError(ws, 'Lobby plein', 'LOBBY_FULL');
    return;
  }
  
  const player = players.get(ws.playerId);
  console.log('🚪 [BombParty] Rejoindre lobby:', payload.roomId, 'par', player.name);
  
  // Ajouter le joueur au lobby
  lobby.players.set(ws.playerId, player);
  player.roomId = payload.roomId;
  ws.roomId = payload.roomId;
  
  sendMessage(ws, {
    event: 'bp:lobby:joined',
    payload: {
      roomId: payload.roomId,
      playerId: ws.playerId,
      maxPlayers: lobby.maxPlayers,
      players: Array.from(lobby.players.values()).map(p => ({
        id: p.id,
        name: p.name
      }))
    }
  });
  
  // Notifier tous les joueurs du lobby
  console.log('📢 [BombParty] Envoi bp:lobby:player_joined à tous les joueurs du lobby');
  broadcastToLobby(payload.roomId, {
    event: 'bp:lobby:player_joined',
    payload: {
      roomId: payload.roomId,
      playerId: ws.playerId,
      playerName: player.name,
      players: Array.from(lobby.players.values()).map(p => ({
        id: p.id,
        name: p.name
      }))
    }
  });
}

function handleLobbyStart(ws, payload) {
  if (!ws.playerId) {
    sendError(ws, 'Joueur non authentifié', 'NOT_AUTHENTICATED');
    return;
  }
  
  const lobby = lobbies.get(payload.roomId);
  if (!lobby) {
    sendError(ws, 'Lobby non trouvé', 'LOBBY_NOT_FOUND');
    return;
  }
  
  if (lobby.players.size < 2) {
    sendError(ws, 'Minimum 2 joueurs requis', 'NOT_ENOUGH_PLAYERS');
    return;
  }
  
  if (lobby.isStarted) {
    sendError(ws, 'Le jeu a déjà commencé', 'GAME_ALREADY_STARTED');
    return;
  }
  
  console.log('🎮 [BombParty] Démarrage du jeu:', payload.roomId, 'avec', lobby.players.size, 'joueurs');
  
  // Marquer le lobby comme démarré
  lobby.isStarted = true;
  
  // Créer l'état de jeu avec les vrais joueurs
  const gamePlayers = Array.from(lobby.players.values()).map(player => ({
    id: player.id,
    name: player.name,
    lives: 3,
    isEliminated: false,
    streak: 0,
    bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 }
  }));
  
  // Choisir un trigramme aléatoire
  const currentTrigram = TRIGRAMS[Math.floor(Math.random() * TRIGRAMS.length)];
  
  const gameState = {
    phase: 'TURN_ACTIVE',
    players: gamePlayers,
    currentPlayerIndex: 0,
    currentTrigram: currentTrigram,
    usedWords: [],
    turnEndsAt: Date.now() + 15000,
    turnOrder: gamePlayers.map(p => p.id),
    turnDirection: 1,
    baseTurnSeconds: 15,
    history: []
  };
  
  // Sauvegarder l'état du jeu
  gameStates.set(payload.roomId, gameState);
  
  // Envoyer l'état du jeu à tous les joueurs du lobby
  broadcastToLobby(payload.roomId, {
    event: 'bp:game:state',
    payload: {
      roomId: payload.roomId,
      gameState
    }
  });
  
  // Démarrer un timer pour le premier tour
  startGameTimer(payload.roomId, 0, gamePlayers);
}

function handleGameInput(ws, payload) {
  console.log('🎯 [BombParty] Mot soumis:', payload.word);
  
  const lobby = lobbies.get(payload.roomId);
  if (!lobby) {
    sendError(ws, 'Lobby non trouvé', 'LOBBY_NOT_FOUND');
    return;
  }
  
  // Récupérer l'état actuel du jeu
  let gameState = gameStates.get(payload.roomId);
  if (!gameState) {
    sendError(ws, 'État de jeu non trouvé', 'GAME_STATE_NOT_FOUND');
    return;
  }
  
  // Vérifier que c'est bien le tour du joueur
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== ws.playerId) {
    sendError(ws, 'Ce n\'est pas votre tour', 'NOT_YOUR_TURN');
    return;
  }
  
  // Validation du mot
  const word = payload.word.toLowerCase();
  const currentTrigram = gameState.currentTrigram.toLowerCase();
  
  // Vérifier que le mot contient le trigramme
  const containsTrigram = word.includes(currentTrigram);
  
  // Vérifier que le mot est dans le dictionnaire (si disponible)
  const isInDictionary = TRIGRAM_WORDS[currentTrigram] ? 
    TRIGRAM_WORDS[currentTrigram].includes(word) : true;
  
  // Vérifier les autres conditions
  const isValidLength = word.length >= 3;
  const isNotUsed = !gameState.usedWords.includes(word);
  
  const isValid = containsTrigram && isInDictionary && isValidLength && isNotUsed;
  
  // Mettre à jour l'historique
  gameState.history.push({
    playerId: ws.playerId,
    word: payload.word,
    ok: isValid,
    msTaken: payload.msTaken || 0
  });
  
  if (isValid) {
    // Mot valide : ajouter aux mots utilisés
    gameState.usedWords.push(word);
    console.log('✅ [BombParty] Mot valide:', payload.word, 'pour le trigramme', currentTrigram);
  } else {
    // Mot invalide : le joueur perd une vie
    currentPlayer.lives--;
    console.log('❌ [BombParty] Mot invalide:', payload.word, 'pour le trigramme', currentTrigram);
    console.log('❌ [BombParty] Raisons:', {
      containsTrigram,
      isInDictionary,
      isValidLength,
      isNotUsed,
      availableWords: TRIGRAM_WORDS[currentTrigram] ? TRIGRAM_WORDS[currentTrigram].length : 'N/A'
    });
    console.log('❌ [BombParty] Vies restantes:', currentPlayer.lives);
    
    // Vérifier si le joueur est éliminé
    if (currentPlayer.lives <= 0) {
      currentPlayer.isEliminated = true;
      console.log('💀 [BombParty] Joueur éliminé:', currentPlayer.name);
    }
  }
  
  // Vérifier s'il reste des joueurs en vie
  const alivePlayers = gameState.players.filter(p => !p.isEliminated);
  if (alivePlayers.length <= 1) {
    // Fin de partie
    gameState.phase = 'GAME_OVER';
    console.log('🏆 [BombParty] Fin de partie!');
    
    // Nettoyer le timer
    if (gameTimers.has(payload.roomId)) {
      clearTimeout(gameTimers.get(payload.roomId));
      gameTimers.delete(payload.roomId);
    }
  } else {
    // Passer au joueur suivant
    let nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    
    // Trouver le prochain joueur en vie
    while (gameState.players[nextPlayerIndex].isEliminated) {
      nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
    }
    
    gameState.currentPlayerIndex = nextPlayerIndex;
    gameState.phase = 'TURN_ACTIVE';
    
    // Choisir un nouveau trigramme
    gameState.currentTrigram = TRIGRAMS[Math.floor(Math.random() * TRIGRAMS.length)];
    gameState.turnEndsAt = Date.now() + 15000;
    
    console.log('🔄 [BombParty] Tour suivant:', gameState.players[nextPlayerIndex].name, 'Trigramme:', gameState.currentTrigram);
  }
  
  // Sauvegarder l'état mis à jour
  gameStates.set(payload.roomId, gameState);
  
  // Envoyer l'état du jeu à tous les joueurs du lobby
  broadcastToLobby(payload.roomId, {
    event: 'bp:game:state',
    payload: {
      roomId: payload.roomId,
      gameState
    }
  });
  
  // Démarrer un timer pour le prochain tour (si le jeu continue)
  if (gameState.phase === 'TURN_ACTIVE') {
    startGameTimer(payload.roomId, gameState.currentPlayerIndex, gameState.players);
  }
}

function handleBonusActivate(ws, payload) {
  console.log('🎁 [BombParty] Bonus activé:', payload.bonusKey);
  
  sendMessage(ws, {
    event: 'bp:bonus:applied',
    payload: {
      roomId: payload.roomId,
      bonusKey: payload.bonusKey,
      appliedAt: Date.now()
    }
  });
}

// Fonctions utilitaires
function sendMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws, message, code) {
  sendMessage(ws, {
    event: 'bp:error',
    payload: {
      message,
      code
    }
  });
}

function broadcastToLobby(roomId, message, excludePlayerId = null) {
  const lobby = lobbies.get(roomId);
  if (!lobby) {
    console.log('❌ [BombParty] Lobby non trouvé pour broadcast:', roomId);
    return;
  }
  
  console.log('📢 [BombParty] Broadcast à', lobby.players.size, 'joueurs dans le lobby', roomId, excludePlayerId ? `(excluant ${excludePlayerId})` : '');
  lobby.players.forEach(player => {
    if (excludePlayerId && player.id === excludePlayerId) {
      console.log('⏭️ [BombParty] Exclusion du joueur:', player.id, player.name);
      return;
    }
    
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      console.log('📤 [BombParty] Envoi à joueur:', player.id, player.name);
      sendMessage(player.ws, message);
    } else {
      console.log('❌ [BombParty] Joueur non connecté:', player.id, player.name);
    }
  });
}

function startGameTimer(roomId, currentPlayerIndex, gamePlayers) {
  // Nettoyer l'ancien timer s'il existe
  if (gameTimers.has(roomId)) {
    clearTimeout(gameTimers.get(roomId));
  }
  
  // Démarrer un nouveau timer de 15 secondes
  const timer = setTimeout(() => {
    console.log('⏰ [BombParty] Timer expiré pour le joueur', currentPlayerIndex, 'dans le lobby', roomId);
    
    // Récupérer l'état actuel du jeu
    let gameState = gameStates.get(roomId);
    if (!gameState) {
      console.log('❌ [BombParty] État de jeu non trouvé lors de l\'expiration du timer');
      return;
    }
    
    // Le joueur actuel perd une vie
    const currentPlayer = gameState.players[currentPlayerIndex];
    if (currentPlayer && !currentPlayer.isEliminated) {
      currentPlayer.lives--;
      console.log('⏰ [BombParty] Timer expiré -', currentPlayer.name, 'perd une vie. Vies restantes:', currentPlayer.lives);
      
      // Vérifier si le joueur est éliminé
      if (currentPlayer.lives <= 0) {
        currentPlayer.isEliminated = true;
        console.log('💀 [BombParty] Joueur éliminé par timer:', currentPlayer.name);
      }
    }
    
    // Vérifier s'il reste des joueurs en vie
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    if (alivePlayers.length <= 1) {
      // Fin de partie
      gameState.phase = 'GAME_OVER';
      console.log('🏆 [BombParty] Fin de partie par timer!');
      
      // Envoyer l'état final
      broadcastToLobby(roomId, {
        event: 'bp:game:state',
        payload: {
          roomId,
          gameState
        }
      });
      
      // Nettoyer le timer
      gameTimers.delete(roomId);
      return;
    }
    
    // Passer au joueur suivant
    let nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
    
    // Trouver le prochain joueur en vie
    while (gameState.players[nextPlayerIndex].isEliminated) {
      nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
    }
    
    gameState.currentPlayerIndex = nextPlayerIndex;
    gameState.phase = 'TURN_ACTIVE';
    
    // Choisir un nouveau trigramme
    gameState.currentTrigram = TRIGRAMS[Math.floor(Math.random() * TRIGRAMS.length)];
    gameState.turnEndsAt = Date.now() + 15000;
    
    console.log('🔄 [BombParty] Tour suivant après timer:', gameState.players[nextPlayerIndex].name, 'Trigramme:', gameState.currentTrigram);
    
    // Sauvegarder l'état mis à jour
    gameStates.set(roomId, gameState);
    
    // Envoyer le nouvel état à tous les joueurs
    broadcastToLobby(roomId, {
      event: 'bp:game:state',
      payload: {
        roomId,
        gameState
      }
    });
    
    // Démarrer le timer pour le prochain tour
    startGameTimer(roomId, nextPlayerIndex, gameState.players);
    
    // Nettoyer le timer actuel
    gameTimers.delete(roomId);
  }, 15000);
  
  gameTimers.set(roomId, timer);
  console.log('⏱️ [BombParty] Timer démarré pour le joueur', currentPlayerIndex, 'dans le lobby', roomId);
}

function handlePlayerDisconnect(ws) {
  const playerId = ws.playerId;
  const roomId = ws.roomId;
  
  if (!playerId) return;
  
  console.log('👋 [BombParty] Joueur déconnecté:', playerId);
  
  // Retirer le joueur de la Map des joueurs
  players.delete(playerId);
  
  if (roomId) {
    const lobby = lobbies.get(roomId);
    if (lobby) {
      // Retirer le joueur du lobby
      lobby.players.delete(playerId);
      
      // Nettoyer le timer du jeu
      if (gameTimers.has(roomId)) {
        clearTimeout(gameTimers.get(roomId));
        gameTimers.delete(roomId);
      }
      
      // Nettoyer l'état du jeu
      gameStates.delete(roomId);
      
      // Notifier les autres joueurs
      broadcastToLobby(roomId, {
        event: 'bp:lobby:player_left',
        payload: {
          roomId,
          playerId,
          players: Array.from(lobby.players.values()).map(p => ({
            id: p.id,
            name: p.name
          }))
        }
      });
      
      // Si le lobby est vide, le supprimer
      if (lobby.players.size === 0) {
        lobbies.delete(roomId);
        console.log('🗑️ [BombParty] Lobby supprimé (vide):', roomId);
      }
    }
  }
}

// Démarrer le serveur
server.listen(3002, () => {
  console.log('✅ [BombParty] Serveur HTTP démarré sur le port 3002');
});
