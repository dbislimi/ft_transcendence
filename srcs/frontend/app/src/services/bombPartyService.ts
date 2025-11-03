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
      1
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
      console.log(`[BombPartyService] Connected [${this.connectionId}]`);
      const store = useBombPartyStore.getState();
      store.setConnectionState('connected');
      store.setReconnectAttempts(0);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.authenticate('Player_' + Math.random().toString(36).substr(2, 9));
    };

    this.ws.onmessage = (event) => {
      if (!wsCoordinator.isPrimaryConnection(this.connectionId)) {
        console.log(`[BombPartyService] Not priority, closing connection [${this.connectionId}]`);
        this.disconnect();
        return;
      }
      
      try {
        const message: BombPartyMessage = JSON.parse(event.data);
        if (message.event !== 'bp:ping' && message.event !== 'bp:pong') {
          console.log(`[BombPartyService] Message received [${this.connectionId}]:`, { event: message.event });
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

      case 'bp:game:state':
        store.receiveServerState(message.payload.gameState);
        break;

      case 'bp:game:end':
        store.setGamePhase('GAME_OVER');
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
      if (!wsCoordinator.isPrimaryConnection(this.connectionId)) {
        console.log(`[BombPartyService] Not priority during heartbeat, closing [${this.connectionId}]`);
        this.disconnect();
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
