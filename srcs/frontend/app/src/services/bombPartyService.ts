import { useBombPartyStore } from '../store/useBombPartyStore';
import { wsCoordinator } from './ws/WebSocketCoordinator';

export interface BombPartyMessage {
  t?: string;
  event?: string;
  payload?: any;
  code?: string;
  msg?: string;
  turnStartedAt?: number;
  turnDurationMs?: number;
  currentPlayerId?: string;
  gameState?: any;
}

export interface TypedError {
  t: 'error';
  code: string;
  msg: string;
}

// Normalize backend tournament bracket to frontend shape { matches: [], rounds: number }
function normalizeTournamentBracket(bracket: any): { matches: any[]; rounds: number } | null {
  if (!bracket) return null;
  // Already in expected shape
  if (Array.isArray(bracket.matches) && typeof bracket.rounds === 'number') {
    // ensure readyPlayers presence if provided
    const safeMatches = bracket.matches.map((m: any) => ({
      ...m,
      readyPlayers: m.readyPlayers || m.ready || (Array.isArray(m.ready) ? m.ready : [])
    }));
    return { matches: safeMatches, rounds: bracket.rounds };
  }
  // Backend shape: { rounds: [{ roundNumber, matches: [...] }, ...], totalRounds, currentRound }
  if (Array.isArray(bracket.rounds)) {
    const matches: any[] = [];
    bracket.rounds.forEach((round: any) => {
      const rnum = round.roundNumber ?? round.round ?? 0;
      (round.matches || []).forEach((m: any) => {
        // Normaliser les joueurs
        const player1 = m.players?.[0] ? { id: m.players[0].id, name: m.players[0].name } : m.player1;
        const player2 = m.players?.[1] ? { id: m.players[1].id, name: m.players[1].name } : m.player2;
        
        // Normaliser le gagnant
        let winner = m.winner;
        if (m.winnerId && !winner) {
          if (m.players) {
            const w = m.players.find((p: any) => p.id === m.winnerId);
            if (w) winner = { id: w.id, name: w.name };
          } else if (player1?.id === m.winnerId) {
            winner = player1;
          } else if (player2?.id === m.winnerId) {
            winner = player2;
          }
        }
        
        // Normaliser le statut
        let status = m.status;
        if (status === 'PENDING') status = 'WAITING';
        if (!status) status = 'WAITING';
        
        // Normaliser readyPlayers
        let readyPlayers: string[] = [];
        if (m.ready) {
          if (typeof m.ready === 'object' && !Array.isArray(m.ready)) {
            // Format { playerId: boolean }
            readyPlayers = Object.entries(m.ready)
              .filter(([_, v]) => v === true)
              .map(([pid]) => pid);
          } else if (Array.isArray(m.ready)) {
            readyPlayers = m.ready;
          }
        } else if (m.readyPlayers) {
          readyPlayers = Array.isArray(m.readyPlayers) ? m.readyPlayers : [];
        }
        
        matches.push({ 
          id: m.matchId || m.id || `match-${rnum}-${matches.length}`,
          round: rnum,
          player1,
          player2,
          winner,
          status,
          roomId: m.roomId,
          readyPlayers
        });
      });
    });
    const rounds = bracket.totalRounds ?? bracket.rounds.length ?? 0;
    return { matches, rounds };
  }
  return null;
}

export class BombPartyService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelays = [1000, 2000, 5000, 10000, 10000];
  private heartbeatInterval: number | null = null;
  private lastPong = Date.now();
  private readonly PONG_TIMEOUT = 10000;
  private connectionId: string;
  private registeredWithCoordinator: boolean = false;
  private isInitialized: boolean = false;
  private pendingPlayerName: string | null = null;
  private isWebSocketReady: boolean = false;

  constructor() {
    this.connectionId = `bps_${Math.random().toString(36).substring(2, 10)}`;
    console.log(`[BombPartyService] Instance created [${this.connectionId}] (not connected yet)`);
    // Don't connect automatically - wait for explicit init()
  }

  public init(): void {
    if (this.isInitialized) {
      console.log(`[BombPartyService] Already initialized [${this.connectionId}]`);
      return;
    }
    console.log(`[BombPartyService] Manual initialization [${this.connectionId}]`);
    this.isInitialized = true;
    this.connect();
  }

  private connect(): void {
    const store = useBombPartyStore.getState();
    store.setConnectionState('connecting');
    
    this.registeredWithCoordinator = wsCoordinator.registerConnection(
      this.connectionId,
      'bombPartyService',
      50 // Higher than BombPartyClient to remain primary
    );
    
    if (!this.registeredWithCoordinator) {
      console.log(`[BombPartyService] Not authorized by coordinator, connection cancelled [${this.connectionId}]`);
      store.setConnectionState('disconnected');
      return;
    }
    
    try {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const wsUrl = isDev 
        ? `ws://localhost:3001/bombparty/ws`
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/bombparty/ws`;
      
      console.log(`[BombPartyService] Connecting to: ${wsUrl} [${this.connectionId}]`);
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error(`[BombPartyService] Connection error [${this.connectionId}]:`, error);
      this.handleConnectionError();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log(`[BombPartyService] WebSocket connected [${this.connectionId}]`);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.isWebSocketReady = true;

      // Authentication decision (no modal here; tournament view triggers modal if needed)
      const token = localStorage.getItem('token');
      const storedName = localStorage.getItem('bombparty_player_name');
      const hasAuthUser = !!token;

      console.log('[BombPartyService][AuthDecision]', { hasAuthUser, storedName, pending: this.pendingPlayerName });

      if (this.pendingPlayerName) {
        this.authenticate(this.pendingPlayerName);
        this.pendingPlayerName = null;
        return;
      }

      if (storedName) {
        this.authenticate(storedName);
        return;
      }

      if (hasAuthUser) {
        this.authenticate('AuthenticatedUser');
        return;
      }

      const guestId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      this.authenticate(`Guest_${guestId}`);
    };

    this.ws.onmessage = (event) => {
      // Allow all connections to receive messages (multi-tab support for tournaments)
      // Each tab represents a different player with different credentials
      const isPrimary = wsCoordinator.isPrimaryConnection(this.connectionId);
      
      try {
        const message: BombPartyMessage = JSON.parse(event.data);
        if (message.event !== 'bp:ping' && message.event !== 'bp:pong') {
          console.log(`[BombPartyService] Message received [${this.connectionId}] (primary: ${isPrimary}):`, { event: message.event });
        }
        this.handleMessage(message);
      } catch (error) {
        console.error(`[BombPartyService] Error parsing message [${this.connectionId}]:`, error);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[BombPartyService] Disconnected [${this.connectionId}]:`, event.code, event.reason);
      this.stopHeartbeat();
      this.handleDisconnection();
    };

    this.ws.onerror = (error) => {
      console.error(`[BombPartyService] WebSocket error [${this.connectionId}]:`, error);
      this.handleConnectionError();
    };
  }

  private handleMessage(message: BombPartyMessage): void {
    const store = useBombPartyStore.getState();

    if (message.t === 'error') {
      const error = message as TypedError;
      store.setLastError(error.msg);
      return;
    }

    // Gérer les messages sans event ou avec event undefined
    if (!message.event) {
      console.warn(`[BombPartyService] Message received without event field:`, message);
      return;
    }

    if (message.event === 'bp:pong') {
      this.lastPong = Date.now();
      return;
    }

    switch (message.event) {
      case 'bp:welcome':
        console.log('[BombParty] Welcome message received');
        break;

      case 'bp:auth:success':
        store.setPlayerId(message.payload.playerId);
        store.setIsAuthenticating(false);
        store.setConnectionState('connected'); // Passe à "connected" après auth réussie
        this.requestLobbyList();
        break;

      case 'bp:lobby:created':
        store.setRoomId(message.payload.roomId);
        store.setIsHost(true);
        store.setLobbyMaxPlayers(message.payload.maxPlayers);
        break;

      case 'bp:lobby:joined':
        store.setRoomId(message.payload.roomId);
        store.setLobbyPlayers(message.payload.players);
        store.setLobbyMaxPlayers(message.payload.maxPlayers);
        // Derive host: first player in list === current player
        if (message.payload.players && store.connection.playerId) {
          const first = message.payload.players[0]?.id;
          store.setIsHost(first === store.connection.playerId);
        }
        break;

      case 'bp:lobby:left':
        store.setRoomId(null);
        store.setIsHost(false);
        store.setLobbyPlayers([]);
        break;

      case 'bp:lobby:list':
        store.setLobbies(message.payload.rooms);
        break;

      case 'bp:lobby:list_updated':
        store.setLobbies(message.payload.rooms);
        break;

      case 'bp:lobby:details':
        break;
        
      case 'bp:room:state':
        console.log('[BombParty] Room state updated:', message.payload);
        if (store.connection.roomId === message.payload.roomId) {
          store.setLobbyPlayers(message.payload.players);
          store.setLobbyMaxPlayers(message.payload.maxPlayers);
        }
        // Host recalculation on state broadcast
        if (message.payload.players && store.connection.playerId) {
          const first = message.payload.players[0]?.id;
          store.setIsHost(first === store.connection.playerId);
        }
        this.requestLobbyList();
        break;
        
      case 'bp:room:closed':
        console.log('[BombParty] Room closed:', message.payload);
        store.setRoomId(null);
        store.setLobbyPlayers([]);
        store.setIsHost(false);
        store.setLastError('Room closed by host');
        break;
        
      case 'bp:error':
        console.error('[BombParty] Server error:', message.payload);
        const errorCode = message.payload.code;
        let errorMessage = 'An error occurred';
        
        switch (errorCode) {
          case 'ROOM_FULL':
            errorMessage = 'Room is full';
            break;
          case 'BAD_PASSWORD':
            errorMessage = 'Incorrect password';
            break;
          case 'ROOM_NOT_FOUND':
            errorMessage = 'Room not found';
            break;
          case 'NOT_AUTH':
            errorMessage = 'You must be connected';
            break;
          default:
            errorMessage = message.payload.message || errorMessage;
        }
        
        store.setLastError(errorMessage);
        break;

      case 'bp:game:countdown':
        console.log('[BombPartyService] Game countdown received:', message.payload);
        // Mettre à jour le gamePhase pour passer en mode GAME
        // Les hooks utiliseront cette information via le store
        store.setGamePhase('GAME');
        break;

      case 'bp:game:start':
        console.log('[BombPartyService] Game start received:', message.payload);
        // Confirmer que le jeu démarre
        store.setGamePhase('GAME');
        break;

      case 'bp:game:state':
        store.receiveServerState(message.payload.gameState);
        // Si on reçoit un game state avec phase TURN_ACTIVE, on est en jeu
        if (message.payload.gameState?.phase === 'TURN_ACTIVE') {
          store.setGamePhase('GAME');
        }
        break;

      case 'bp:game:end':
        store.setGamePhase('GAME_OVER');
        break;

      case 'bp:tournament:created':
        store.setTournamentId(message.payload.tournamentId);
        break;

      case 'bp:tournament:joined':
        store.setTournamentId(message.payload.tournamentId);
        // Extract from tournament object if present
        if (message.payload.tournament) {
          store.setTournamentPlayers(message.payload.tournament.players || []);
          store.setTournamentCapacity(message.payload.tournament.capacity || 0);
          store.setTournamentStatus(message.payload.tournament.status || 'WAITING');
        } else {
          // Fallback to direct properties
          store.setTournamentPlayers(message.payload.players || []);
          store.setTournamentCapacity(message.payload.capacity || 0);
        }
        break;

      case 'bp:tournament:left':
        store.setTournamentId(null);
        store.setTournamentPlayers([]);
        break;

      case 'bp:tournament:list':
        {
          const list = (message.payload.tournaments || []).map((t: any) => ({
            id: t.id,
            capacity: t.capacity,
            currentPlayers: t.playerCount ?? t.currentPlayers ?? 0,
            isPrivate: !!t.isPrivate,
            status: t.status,
            createdAt: t.createdAt,
          }));
          store.setTournaments(list);
        }
        break;

      case 'bp:tournament:status':
        store.setTournamentStatus(message.payload.status);
        {
          const nb = normalizeTournamentBracket(message.payload.bracket);
          if (nb) store.setTournamentBracket(nb);
        }
        store.setTournamentCurrentRound(message.payload.currentRound);
        if (message.payload.tournament) {
          if (message.payload.tournament.players) {
            store.setTournamentPlayers(message.payload.tournament.players);
          }
          if (message.payload.tournament.capacity !== undefined) {
            store.setTournamentCapacity(message.payload.tournament.capacity);
          }
        }
        break;

      case 'bp:tournament:updated':
        if (message.payload.players) {
          store.setTournamentPlayers(message.payload.players);
        }
        if (message.payload.capacity) {
          store.setTournamentCapacity(message.payload.capacity);
        }
        if (message.payload.status) {
          store.setTournamentStatus(message.payload.status);
        }
        if (message.payload.bracket) {
          const nb = normalizeTournamentBracket(message.payload.bracket);
          if (nb) store.setTournamentBracket(nb);
        }
        if (message.payload.currentRound !== undefined) {
          store.setTournamentCurrentRound(message.payload.currentRound);
        }
        break;


      case 'bp:tournament:match_ready': {
        const bracket = store.tournamentBracket;
        if (bracket) {
          const updated = bracket.matches.map((m: any) => {
            if (m.id === message.payload.matchId) {
              return { ...m, readyPlayers: message.payload.readyPlayers || [] };
            }
            return m;
          });
          store.setTournamentBracket({ ...bracket, matches: updated });
        }
        break;
      }
      
      case 'bp:tournament:match_started': {
        store.setTournamentMatchRoomId(message.payload.matchId, message.payload.roomId);
        // Mettre à jour le statut du match dans le bracket seulement quand le match démarre vraiment
        const bracket = store.tournamentBracket;
        if (bracket) {
          const updated = bracket.matches.map((m: any) => {
            if (m.id === message.payload.matchId) {
              console.log('[BombPartyService] Match started, updating status to IN_PROGRESS for match:', message.payload.matchId);
              return { ...m, status: 'IN_PROGRESS', roomId: message.payload.roomId };
            }
            return m;
          });
          store.setTournamentBracket({ ...bracket, matches: updated });
        }
        // Redirection automatique vers la room si le joueur est dans ce match
        if (message.payload.roomId && store.connection.playerId) {
          const bracket = store.tournamentBracket;
          if (bracket) {
            const match = bracket.matches.find((m: any) => m.id === message.payload.matchId);
            if (match && (match.player1?.id === store.connection.playerId || match.player2?.id === store.connection.playerId)) {
              // Redirection automatique après un court délai pour laisser le temps au backend de créer la room
              setTimeout(() => {
                window.location.href = `/bomb-party?room=${message.payload.roomId}`;
              }, 500);
            }
          }
        }
        break;
      }

      case 'bp:tournament:match_ended':
        // Mettre à jour le bracket avec les résultats du match
        if (message.payload.bracket) {
          const nb = normalizeTournamentBracket(message.payload.bracket);
          if (nb) store.setTournamentBracket(nb);
        } else {
          // Mettre à jour manuellement le match si le bracket n'est pas fourni
          const bracket = store.tournamentBracket;
          if (bracket) {
            const updated = bracket.matches.map((m: any) => {
              if (m.id === message.payload.matchId) {
                const winner = message.payload.winnerId 
                  ? (m.player1?.id === message.payload.winnerId ? m.player1 : m.player2)
                  : undefined;
                return { 
                  ...m, 
                  status: 'FINISHED', 
                  winner 
                };
              }
              return m;
            });
            store.setTournamentBracket({ ...bracket, matches: updated });
          }
        }
        break;

      case 'bp:tournament:started':
        if (message.payload.bracket) {
          store.setTournamentStatus('IN_PROGRESS');
          const nb = normalizeTournamentBracket(message.payload.bracket);
          if (nb) {
            console.log('[BombPartyService] Tournament started, bracket normalized:', nb);
            store.setTournamentBracket(nb);
          }
          const curRound = message.payload.bracket.currentRound ?? null;
          if (curRound !== null) store.setTournamentCurrentRound(curRound);
        }
        break;

      case 'bp:tournament:round_started':
        store.setTournamentStatus('IN_PROGRESS');
        if (message.payload.bracket) {
          const nb = normalizeTournamentBracket(message.payload.bracket);
          if (nb) {
            console.log('[BombPartyService] Round started, bracket normalized:', nb);
            store.setTournamentBracket(nb);
          }
        }
        if (message.payload.currentRound !== undefined) {
          console.log('[BombPartyService] Round started, currentRound:', message.payload.currentRound);
          store.setTournamentCurrentRound(message.payload.currentRound);
        }
        break;

      case 'bp:tournament:round_ended':
        if (message.payload.bracket) {
          const nb = normalizeTournamentBracket(message.payload.bracket);
          if (nb) store.setTournamentBracket(nb);
        }
        if (message.payload.currentRound !== undefined) store.setTournamentCurrentRound(message.payload.currentRound);
        break;

      case 'bp:tournament:player_joined':
        // When a player joins, add them to the list
        if (message.payload.tournamentId === store.tournamentId && message.payload.player) {
          const existingPlayers = store.tournamentPlayers;
          const alreadyExists = existingPlayers.some(p => p.id === message.payload.player.id);
          if (!alreadyExists) {
            store.setTournamentPlayers([...existingPlayers, message.payload.player]);
          }
          if (message.payload.capacity) store.setTournamentCapacity(message.payload.capacity);
        }
        break;

      case 'bp:tournament:player_left':
        // When a player leaves, remove them from the list
        if (message.payload.tournamentId === store.tournamentId) {
          const updatedPlayers = store.tournamentPlayers.filter(p => p.id !== message.payload.playerId);
          store.setTournamentPlayers(updatedPlayers);
        }
        break;

      case 'bp:tournament:player_forfeit':
        // Optional: could surface a toast/notification. For now, rely on updated bracket events.
        break;

      case 'bp:tournament:finished':
        store.setTournamentStatus('FINISHED');
        store.setTournamentWinner(message.payload.winner);
        break;

      case 'turn_started':
        if (message.turnStartedAt !== undefined && 
            message.turnDurationMs !== undefined && 
            message.currentPlayerId !== undefined) {
          store.handleTurnStarted(
            message.turnStartedAt,
            message.turnDurationMs,
            message.currentPlayerId
          );
        }
        break;

      case 'game_state':
        store.receiveServerState(message.gameState);
        break;

      default:
        console.log('[BombParty] Unknown message:', message);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      // If not primary, do not close; just skip heartbeat tick
      if (!wsCoordinator.isPrimaryConnection(this.connectionId)) {
        // console.log(`[BombPartyService] Not primary during heartbeat, skipping [${this.connectionId}]`);
        return;
      }
      
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'bp:ping' }));
        
        setTimeout(() => {
          if (Date.now() - this.lastPong > this.PONG_TIMEOUT) {
            console.warn(`[BombPartyService] Pong timeout, reconnecting... [${this.connectionId}]`);
            this.handleConnectionError();
          }
        }, 5000);
      }
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleDisconnection(): void {
    const store = useBombPartyStore.getState();
    store.setConnectionState('disconnected');
    
    if (this.registeredWithCoordinator) {
      wsCoordinator.unregisterConnection(this.connectionId);
      this.registeredWithCoordinator = false;
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      store.setLastError('Connection lost. Please refresh the page.');
    }
  }

  private handleConnectionError(): void {
    const store = useBombPartyStore.getState();
    store.setConnectionState('reconnecting');
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.stopHeartbeat();
    
    if (this.registeredWithCoordinator) {
      wsCoordinator.unregisterConnection(this.connectionId);
      this.registeredWithCoordinator = false;
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    const delay = this.reconnectDelays[Math.min(this.reconnectAttempts, this.reconnectDelays.length - 1)];
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      const store = useBombPartyStore.getState();
      store.setReconnectAttempts(this.reconnectAttempts);
      this.connect();
    }, delay);
  }

  authenticate(playerName: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log(`[BombPartyService] Authentication for [${playerName}] [${this.connectionId}]`);
      this.ws.send(JSON.stringify({
        event: 'bp:auth',
        payload: { playerName }
      }));
    }
  }

  // authentifie avec un nom de joueur personnalise et le stocke pour les sessions futures
  authenticateWithName(playerName: string): void {
    // Store the name for future sessions
    localStorage.setItem('bombparty_player_name', playerName);
    
    if (this.isWebSocketReady) {
      // WebSocket is ready, authenticate immediately
      this.authenticate(playerName);
    } else {
      // WebSocket not ready yet, store for later
      this.pendingPlayerName = playerName;
    }
  }

  createRoom(name: string, isPrivate: boolean, password?: string, maxPlayers?: number): void {
    const store = useBombPartyStore.getState();
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (!store.connection.playerId) {
        console.error(`[BombPartyService] Cannot create room: not authenticated [${this.connectionId}]`);
        store.setLastError('You must be connected to create a room');
        return;
      }
      
      console.log(`[BombPartyService] Create room [${this.connectionId}]:`, { name, isPrivate, maxPlayers });
      this.ws.send(JSON.stringify({
        event: 'bp:lobby:create',
        payload: { name, isPrivate, password, maxPlayers }
      }));
    } else {
      console.error(`[BombPartyService] Cannot create room: WebSocket not open [${this.connectionId}]`);
      store.setLastError('Connection lost. Please refresh the page.');
    }
  }

  joinRoom(roomId: string, password?: string): void {
    const store = useBombPartyStore.getState();
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (!store.connection.playerId) {
        console.error(`[BombPartyService] Cannot join: not authenticated [${this.connectionId}]`);
        store.setLastError('You must be connected to join a room');
        return;
      }
      
      console.log(`[BombPartyService] Join room [${this.connectionId}]:`, roomId, password ? '(with password)' : '(public)');
      this.ws.send(JSON.stringify({
        event: 'bp:lobby:join',
        payload: { roomId, password }
      }));
    } else {
      console.error(`[BombPartyService] Cannot join: WebSocket not open [${this.connectionId}]`);
      store.setLastError('Connection lost. Please refresh the page.');
    }
  }

  leaveRoom(): void {
    const store = useBombPartyStore.getState();
    if (this.ws?.readyState === WebSocket.OPEN && store.connection.roomId) {
      this.ws.send(JSON.stringify({
        event: 'bp:lobby:leave',
        payload: { roomId: store.connection.roomId }
      }));
    }
  }

  subscribeToRoom(roomId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[BombParty] Subscribing to room:', roomId);
      this.ws.send(JSON.stringify({
        event: 'bp:room:subscribe',
        payload: { roomId }
      }));
    }
  }

  unsubscribeFromRoom(roomId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[BombParty] Unsubscribing from room:', roomId);
      this.ws.send(JSON.stringify({
        event: 'bp:room:unsubscribe',
        payload: { roomId }
      }));
    }
  }

  startGame(): void {
    const store = useBombPartyStore.getState();
    if (this.ws?.readyState === WebSocket.OPEN && store.connection.roomId) {
      this.ws.send(JSON.stringify({
        event: 'bp:lobby:start',
        payload: { roomId: store.connection.roomId }
      }));
    }
  }

  submitWord(word: string, msTaken: number): void {
    const store = useBombPartyStore.getState();
    if (this.ws?.readyState === WebSocket.OPEN && store.connection.roomId) {
      this.ws.send(JSON.stringify({
        event: 'bp:game:input',
        payload: { roomId: store.connection.roomId, word, msTaken }
      }));
    }
  }

  activateBonus(bonusKey: string): void {
    const store = useBombPartyStore.getState();
    if (this.ws?.readyState === WebSocket.OPEN && store.connection.roomId) {
      this.ws.send(JSON.stringify({
        event: 'bp:bonus:activate',
        payload: { roomId: store.connection.roomId, bonusKey }
      }));
    }
  }

  requestLobbyList(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log(`[BombPartyService] Request lobby list [${this.connectionId}]`);
      this.ws.send(JSON.stringify({
        event: 'bp:lobby:list',
        payload: {}
      }));
    } else {
      console.log(`[BombPartyService] Cannot request list: WebSocket not open [${this.connectionId}]`);
    }
  }

  // Tournament methods
  createTournament(capacity: number, password?: string): void {
    const store = useBombPartyStore.getState();
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (!store.connection.playerId) {
        console.error(`[BombPartyService] Cannot create tournament: not authenticated [${this.connectionId}]`);
        store.setLastError('You must be connected to create a tournament');
        return;
      }
      
      console.log(`[BombPartyService] Create tournament [${this.connectionId}]:`, { capacity, password });
      this.ws.send(JSON.stringify({
        event: 'bp:tournament:create',
        payload: { capacity, password }
      }));
    } else {
      console.error(`[BombPartyService] Cannot create tournament: WebSocket not open [${this.connectionId}]`);
      store.setLastError('Connection lost. Please refresh the page.');
    }
  }

  joinTournament(tournamentId: string, password?: string): void {
    const store = useBombPartyStore.getState();
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (!store.connection.playerId) {
        console.error(`[BombPartyService] Cannot join tournament: not authenticated [${this.connectionId}]`);
        store.setLastError('You must be connected to join a tournament');
        return;
      }
      
      console.log(`[BombPartyService] Join tournament [${this.connectionId}]:`, tournamentId, password ? '(with password)' : '(public)');
      this.ws.send(JSON.stringify({
        event: 'bp:tournament:join',
        payload: { tournamentId, password }
      }));
    } else {
      console.error(`[BombPartyService] Cannot join tournament: WebSocket not open [${this.connectionId}]`);
      store.setLastError('Connection lost. Please refresh the page.');
    }
  }

  leaveTournament(tournamentId: string): void {
    const store = useBombPartyStore.getState();
    if (this.ws?.readyState === WebSocket.OPEN && tournamentId) {
      this.ws.send(JSON.stringify({
        event: 'bp:tournament:leave',
        payload: { tournamentId }
      }));
    }
  }

  getTournamentStatus(tournamentId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        event: 'bp:tournament:status',
        payload: { tournamentId }
      }));
    }
  }

  listTournaments(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log(`[BombPartyService] Request tournament list [${this.connectionId}]`);
      this.ws.send(JSON.stringify({
        event: 'bp:tournament:list',
        payload: {}
      }));
    } else {
      console.log(`[BombPartyService] Cannot request tournament list: WebSocket not open [${this.connectionId}]`);
    }
  }

  // Set readiness for a match (confirm / cancel)
  setMatchReady(tournamentId: string, matchId: string, ready: boolean): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        event: 'bp:tournament:ready',
        payload: { tournamentId, matchId, ready }
      }));
    }
  }

  disconnect(): void {
    console.log(`[BombPartyService] Explicit disconnection [${this.connectionId}]`);
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.registeredWithCoordinator) {
      wsCoordinator.unregisterConnection(this.connectionId);
      this.registeredWithCoordinator = false;
    }
    
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        this.ws.close();
      } catch (err) {
        console.warn(`[BombPartyService] Error closing WebSocket [${this.connectionId}]:`, err);
      }
      this.ws = null;
    }
  }
}

export const bombPartyService = new BombPartyService();
