import type { BonusKey } from '../../game-bomb-party/core/types';

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

export interface BombPartyClientOptions {
  mock?: boolean;
}

export class BombPartyClient {
  private mock: boolean;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private ws: WebSocket | null = null;

  constructor(options: BombPartyClientOptions = {}) {
    console.log('[BombPartyClient] 🏗️ Construction du client WebSocket');
    this.mock = options.mock ?? true;
    if (!this.mock) {
      this.connect();
    }
  }

  private connect() {
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      console.log('[BombPartyClient] Connexion déjà en cours, abandon...');
      return;
    }
    
    console.log('[BombPartyClient] Tentative de connexion WebSocket...');
    this.ws = new WebSocket('ws://localhost:3002/bombparty/ws');
    
    this.ws.onopen = () => {
      console.log('[BombPartyClient] ✅ Connexion WebSocket établie');
      console.log('[BombPartyClient] Émission événement connected');
      this._emit('connected', {});
    };
    
    this.ws.onmessage = (event) => {
      try {
        console.log('[BombPartyClient] Message reçu:', event.data);
        const data = JSON.parse(event.data);
        console.log('[BombPartyClient] Message parsé:', data);
        this._emit(data.event, data.payload);
      } catch (err) {
        console.error('[BombPartyClient] Erreur parsing message:', err);
      }
    };
    
    this.ws.onclose = (event) => {
      console.log('[BombPartyClient] ❌ Connexion fermée:', event.code, event.reason);
      this._emit('disconnected', {});
    };
    
    this.ws.onerror = (error) => {
      console.error('[BombPartyClient] ❌ Erreur WebSocket:', error);
      this._emit('error', { error: 'WebSocket error' });
    };
  }

  on(event: 'bonus:applied', handler: EventHandler): () => void;
  on(event: 'bp:auth:success', handler: EventHandler): () => void;
  on(event: 'bp:lobby:created', handler: EventHandler): () => void;
  on(event: 'bp:lobby:joined', handler: EventHandler): () => void;
  on(event: 'bp:lobby:player_joined', handler: EventHandler): () => void;
  on(event: 'bp:lobby:player_left', handler: EventHandler): () => void;
  on(event: 'bp:game:state', handler: EventHandler): () => void;
  on(event: 'bp:game:word_result', handler: EventHandler): () => void;
  on(event: 'bp:game:end', handler: EventHandler): () => void;
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

  emit(event: 'bp:bonus:activate', payload: BonusActivatePayload): void;
  emit(event: 'bp:auth', payload: any): void;
  emit(event: 'bp:lobby:create', payload: any): void;
  emit(event: 'bp:lobby:join', payload: any): void;
  emit(event: 'bp:lobby:leave', payload: any): void;
  emit(event: 'bp:lobby:start', payload: any): void;
  emit(event: 'bp:game:input', payload: any): void;
  emit(event: string, payload: any): void {
    console.log('[BombPartyClient] 📤 Envoi message:', event, 'État WebSocket:', this.ws?.readyState);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ event, payload });
      console.log('[BombPartyClient] 📤 Message envoyé:', message);
      this.ws.send(message);
    } else if (this.mock) {
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
    console.log('[BombPartyClient] 🔐 Envoi authentification pour:', playerName);
    this.emit('bp:auth', { playerName });
  }

  createLobby(name: string, isPrivate: boolean, password?: string, maxPlayers: number = 4): void {
    this.emit('bp:lobby:create', { name, isPrivate, password, maxPlayers });
  }

  joinLobby(roomId: string, password?: string): void {
    this.emit('bp:lobby:join', { roomId, password });
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
    this.emit('bp:bonus:activate', { roomId, playerId: 'current', bonusKey });
  }

  sendMessage(message: { event: string; payload: any }): void {
    console.log('📤 [BombPartyClient] Envoi message:', message);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('[BombPartyClient] WebSocket non connecté, état:', this.ws?.readyState);
    }
  }

  off(event: string, handler: EventHandler): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  private _emit(event: string, payload: any) {
    console.log('🔊 [BombPartyClient] Émission événement:', event, payload);
    const set = this.handlers.get(event);
    if (!set) {
      console.log('[BombPartyClient] Aucun handler pour l\'événement:', event);
      return;
    }
    console.log('📢 [BombPartyClient] Handlers trouvés pour', event, ':', set.size);
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('BombPartyClient handler error', err);
      }
    }
  }
}


