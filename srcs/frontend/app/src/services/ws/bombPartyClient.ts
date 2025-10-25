import type { BonusKey } from '../../game-bomb-party/core/types';
import { wsCoordinator } from './WebSocketCoordinator';

type EventHandler = (payload: any) => void;

export interface BonusActivatePayload {
  roomId: string;
  playerId: string;
  bonusKey: BonusKey;
}

export interface LobbyCreatePayload {
  name: string;
  isPrivate: boolean;
  password?: string;
  maxPlayers: number;
}

export interface LobbyJoinPayload {
  roomId: string;
  password?: string;
}

export type BombPartyEvent = 
  | 'bp:bonus:activate'
  | 'bp:auth'
  | 'bp:lobby:create'
  | 'bp:lobby:join'
  | 'bp:lobby:leave'
  | 'bp:lobby:start'
  | 'bp:game:input'
  | 'bp:room:subscribe'
  | 'bp:room:unsubscribe'
  | 'bp:ping'
  | 'bp:lobby:list'
  | string;

export interface BombPartyClientOptions {
  mock?: boolean;
  priority?: number;
}

export class BombPartyClient {
  private mock: boolean;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private ws: WebSocket | null = null;
  private connectionId: string = '';
  private isConnecting: boolean = false;
  private reconnectTimer: number | null = null;
  private priority: number = 10;
  private registeredWithCoordinator: boolean = false;

  constructor(options: BombPartyClientOptions = {}) {
    console.log('[BombPartyClient] WebSocket client construction');
    this.mock = options.mock ?? false;
    this.connectionId = `bpc_${Math.random().toString(36).substring(2, 10)}`;
    this.priority = options.priority ?? 20;
    
    console.log(`[BombPartyClient] Instance created [${this.connectionId}] with priority ${this.priority}`);
  }

  public connect() {
    if (this.isConnecting || (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN))) {
      console.log(`[BombPartyClient] Connection already in progress or active, ignored [${this.connectionId}]`);
      return;
    }
    
    this.registeredWithCoordinator = wsCoordinator.registerConnection(
      this.connectionId,
      'bombPartyClient',
      this.priority
    );
    
    if (!this.registeredWithCoordinator) {
      console.log(`[BombPartyClient] Not priority for now, waiting [${this.connectionId}]`);
      return;
    }
    
    this.isConnecting = true;
    console.log(`[BombPartyClient] WebSocket connection attempt... [${this.connectionId}]`);
    
    try {
      this.ws = new WebSocket('ws://localhost:3001/bombparty/ws');
      
      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log(`[BombPartyClient] Connexion établie [${this.connectionId}]`);
        this._emit('connected', {});
      };
      
      this.ws.onmessage = (event) => {
        if (!wsCoordinator.isPrimaryConnection(this.connectionId)) {
          console.log(`[BombPartyClient] Not priority, message ignored [${this.connectionId}]`);
          return;
        }
        
        try {
          const data = JSON.parse(event.data);
          if (data.event !== 'bp:ping' && data.event !== 'bp:pong') {
            console.log('[BombPartyClient] Message received:', {
              event: data.event,
              connectionId: this.connectionId
            });
          }
          this._emit(data.event, data.payload);
        } catch (err) {
          console.error('[BombPartyClient] Error parsing message:', err);
        }
      };
      
      this.ws.onclose = (event) => {
        this.isConnecting = false;
        console.log(`[BombPartyClient] Connection closed [${this.connectionId}], code: ${event.code}`);
        this._emit('disconnected', {});
      };
      
      this.ws.onerror = (error) => {
        this.isConnecting = false;
        console.error(`[BombPartyClient] WebSocket error [${this.connectionId}]:`, error);
        this._emit('error', { error: 'WebSocket error' });
      };
    } catch (err) {
      this.isConnecting = false;
      console.error(`[BombPartyClient] Exception lors de la connexion [${this.connectionId}]:`, err);
    }
  }

  public disconnect() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.registeredWithCoordinator) {
      wsCoordinator.unregisterConnection(this.connectionId);
      this.registeredWithCoordinator = false;
    }
    
    if (this.ws) {
      try {
        console.log(`[BombPartyClient] WebSocket disconnection [${this.connectionId}]`);
        
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        this.ws.close(1000, "Normal closure");
      } catch (err) {
        console.warn(`[BombPartyClient] Error closing WebSocket [${this.connectionId}]:`, err);
      }
      
      this.ws = null;
      this.isConnecting = false;
      this.authenticated = false;
    }
  }

  on(event: 'bonus:applied', handler: EventHandler): () => void;
  on(event: 'bp:auth:success', handler: EventHandler): () => void;
  on(event: 'bp:lobby:created', handler: EventHandler): () => void;
  on(event: 'bp:lobby:joined', handler: EventHandler): () => void;
  on(event: 'bp:lobby:player_joined', handler: EventHandler): () => void;
  on(event: 'bp:room:state', handler: EventHandler): () => void;
  on(event: 'bp:lobby:player_left', handler: EventHandler): () => void;
  on(event: 'bp:game:state', handler: EventHandler): () => void;
  on(event: 'bp:game:word_result', handler: EventHandler): () => void;
  on(event: 'bp:game:end', handler: EventHandler): () => void;
  on(event: 'bp:game:countdown', handler: EventHandler): () => void;
  on(event: 'bp:game:start', handler: EventHandler): () => void;
  on(event: 'connected', handler: EventHandler): () => void;
  on(event: 'error', handler: EventHandler): () => void;
  on(event: string, handler: EventHandler): () => void {
    const set = this.handlers.get(event) ?? new Set<EventHandler>();
    set.add(handler);
    this.handlers.set(event, set);
    return () => {
      set.delete(handler);
    };
  }

  private authenticated: boolean = false;
  private currentPlayerName: string | null = null;
  private pendingMessages: Array<{event: string, payload: any}> = [];

  emit(event: BombPartyEvent, payload: any): void {
    if (event !== 'bp:ping') {
      console.log(`[BombPartyClient] Send message [${this.connectionId}]:`, event, 'WebSocket state:', this.ws?.readyState);
    }
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (event !== 'bp:ping') {
        console.log(`[BombPartyClient] WebSocket not ready, queuing message [${this.connectionId}]:`, event);
        this.pendingMessages.push({ event, payload });
        
        if (!this.isConnecting && (!this.ws || this.ws.readyState !== WebSocket.CONNECTING)) {
          console.log(`[BombPartyClient] Reconnection attempt to send message [${this.connectionId}]`);
          this.connect();
        }
      }
      return;
    }
    
    try {
      const message = JSON.stringify({ event, payload });
      this.ws.send(message);
    } catch (err) {
      console.error(`[BombPartyClient] Error sending message [${this.connectionId}]:`, err);
      
      this.pendingMessages.push({ event, payload });
      this.disconnect();
      
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, 1000) as unknown as number;
    }
    
    // Mode mock pour les tests
    if (this.mock && !this.ws) {
      if (event === 'bp:bonus:activate') {
        setTimeout(() => {
          this._emit('bonus:applied', {
            roomId: payload.roomId,
            playerId: payload.playerId,
            bonusKey: payload.bonusKey,
            appliedAt: Date.now(),
          });
        }, 50);
      }
    }
  }

  authenticate(playerName: string): void {
    if (this.authenticated && this.currentPlayerName === playerName) {
      console.log(`[BombPartyClient] Already authenticated as [${playerName}], ignored [${this.connectionId}]`);
      return;
    }
    
    console.log(`[BombPartyClient] Send authentication for [${playerName}] [${this.connectionId}]`);
    this.currentPlayerName = playerName;
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log(`[BombPartyClient] WebSocket not connected during authentication, connecting... [${this.connectionId}]`);
      this.pendingMessages.push({ event: 'bp:auth', payload: { playerName } });
      this.connect();
      return;
    }
    
    this.emit('bp:auth', { playerName });
  }

  createLobby(name: string, isPrivate: boolean, password?: string, maxPlayers: number = 4): void {
    this.emit('bp:lobby:create', { name, isPrivate, password, maxPlayers } as LobbyCreatePayload);
  }

  joinLobby(roomId: string, password?: string): void {
    this.emit('bp:lobby:join', { roomId, password } as LobbyJoinPayload);
  }

  leaveLobby(roomId: string): void {
    this.emit('bp:lobby:leave', { roomId });
  }

  startGame(roomId: string): void {
    this.emit('bp:lobby:start', { roomId });
  }

  submitWord(roomId: string, word: string, msTaken: number): void {
    this.emit('bp:game:input', { roomId, word, msTaken });
  }

  activateBonus(roomId: string, bonusKey: BonusKey): void {
    this.emit('bp:bonus:activate', { roomId, playerId: 'current', bonusKey } as BonusActivatePayload);
  }

  sendMessage(message: { event: BombPartyEvent; payload: any }): void {
    console.log('[BombPartyClient] sendMessage:', message, 'ready:', this.ws?.readyState);
    this.emit(message.event, message.payload);
  }

  off(event: string, handler: EventHandler): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  private _emit(event: string, payload: any) {
    const set = this.handlers.get(event);
    
    if (event !== 'bp:ping' && event !== 'bp:pong') {
      console.log('[BombPartyClient] _emit:', {
        event,
        hasHandlers: !!set,
        handlersCount: set?.size || 0,
        connectionId: this.connectionId
      });
    }
    
    if (!set) {
      return;
    }
    
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        console.error('[BombPartyClient] Handler error:', {
          event,
          error: err instanceof Error ? err.message : 'Unknown error',
          connectionId: this.connectionId
        });
      }
    }
    
    if (event === 'connected') {
      if (this.currentPlayerName) {
        this.pendingMessages = this.pendingMessages.filter(msg => msg.event !== 'bp:auth');
        this.emit('bp:auth', { playerName: this.currentPlayerName });
      }
      
      this._processPendingMessages();
    } else if (event === 'bp:auth:success') {
      this.authenticated = true;
      console.log(`[BombPartyClient] Authentication successful [${this.connectionId}]`);
      
      this._processPendingMessages();
    }
  }
  
  private _processPendingMessages() {
    if (this.pendingMessages.length > 0) {
      console.log(`[BombPartyClient] Processing ${this.pendingMessages.length} pending messages [${this.connectionId}]`);
      
      const messagesToSend = [...this.pendingMessages];
      this.pendingMessages = [];
      
      for (const message of messagesToSend) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            const messageStr = JSON.stringify({
              event: message.event,
              payload: message.payload
            });
            this.ws.send(messageStr);
            console.log(`[BombPartyClient] Queued message sent: ${message.event} [${this.connectionId}]`);
          } catch (err) {
            console.error(`[BombPartyClient] Error sending queued message: ${message.event}`, err);
          }
        }
      }
    }
  }
}


