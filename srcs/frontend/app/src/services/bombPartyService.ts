import { useBombPartyStore } from '../store/useBombPartyStore';

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

  constructor() {
    this.connect();
  }

  private connect(): void {
    const store = useBombPartyStore.getState();
    store.setConnectionState('connecting');
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/bombparty/ws`;
      
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[BombParty] Connection error:', error);
      this.handleConnectionError();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[BombParty] Connected');
      const store = useBombPartyStore.getState();
      store.setConnectionState('connected');
      store.setReconnectAttempts(0);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: BombPartyMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('[BombParty] Message parse error:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[BombParty] Disconnected:', event.code, event.reason);
      this.stopHeartbeat();
      this.handleDisconnection();
    };

    this.ws.onerror = (error) => {
      console.error('[BombParty] WebSocket error:', error);
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

    if (message.t === 'pong') {
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
        break;

      case 'bp:lobby:details':
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
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ t: 'ping' }));
        
        setTimeout(() => {
          if (Date.now() - this.lastPong > this.PONG_TIMEOUT) {
            console.warn('[BombParty] Pong timeout, reconnecting...');
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
      this.ws.send(JSON.stringify({
        event: 'bp:auth',
        payload: { playerName }
      }));
    }
  }

  createRoom(name: string, isPrivate: boolean, password?: string, maxPlayers?: number): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        event: 'bp:lobby:create',
        payload: { name, isPrivate, password, maxPlayers }
      }));
    }
  }

  joinRoom(roomId: string, password?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        event: 'bp:lobby:join',
        payload: { roomId, password }
      }));
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

  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const bombPartyService = new BombPartyService();
