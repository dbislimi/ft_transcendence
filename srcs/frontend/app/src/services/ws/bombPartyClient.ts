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
  mock?: boolean; // if true, echo server events locally for dev
}

export class BombPartyClient {
  private mock: boolean;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private ws: WebSocket | null = null;

  constructor(options: BombPartyClientOptions = {}) {
    this.mock = options.mock ?? true;
    if (!this.mock) {
      this.connect();
    }
  }

  private connect() {
    this.ws = new WebSocket('ws://localhost:3000/bombparty/ws');
    this.ws.onopen = () => {
      this._emit('connected', {});
    };
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._emit(data.event, data.payload);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
    this.ws.onclose = () => {
      this._emit('disconnected', {});
    };
    this.ws.onerror = (error) => {
      this._emit('error', { error: 'WebSocket error' });
    };
  }

  on(event: 'bonus:applied', handler: EventHandler): () => void;
  on(event: 'auth:success', handler: EventHandler): () => void;
  on(event: 'lobby:created', handler: EventHandler): () => void;
  on(event: 'lobby:joined', handler: EventHandler): () => void;
  on(event: 'lobby:player_joined', handler: EventHandler): () => void;
  on(event: 'lobby:player_left', handler: EventHandler): () => void;
  on(event: 'game:state', handler: EventHandler): () => void;
  on(event: 'game:end', handler: EventHandler): () => void;
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

  emit(event: 'bonus:activate', payload: BonusActivatePayload): void;
  emit(event: 'auth:request', payload: any): void;
  emit(event: 'lobby:create', payload: any): void;
  emit(event: 'lobby:join', payload: any): void;
  emit(event: 'lobby:leave', payload: any): void;
  emit(event: 'lobby:start', payload: any): void;
  emit(event: 'game:submit_word', payload: any): void;
  emit(event: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, payload }));
    } else if (this.mock) {
      // Simulate server acknowledgement/broadcast
      if (event === 'bonus:activate') {
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

  // Méthodes pour l'authentification
  authenticate(playerName: string): void {
    this.emit('auth:request', { playerName });
  }

  // Méthodes pour le lobby
  createLobby(name: string, isPrivate: boolean, password?: string, maxPlayers: number = 4): void {
    this.emit('lobby:create', { name, isPrivate, password, maxPlayers });
  }

  joinLobby(roomId: string, password?: string): void {
    this.emit('lobby:join', { roomId, password });
  }

  leaveLobby(roomId: string): void {
    this.emit('lobby:leave', { roomId });
  }

  startGame(roomId: string): void {
    this.emit('lobby:start', { roomId });
  }

  // Méthodes pour le jeu
  submitWord(roomId: string, word: string, msTaken: number): void {
    this.emit('game:submit_word', { roomId, word, msTaken });
  }

  activateBonus(roomId: string, bonusKey: BonusKey): void {
    this.emit('bonus:activate', { roomId, playerId: 'current', bonusKey });
  }

  // Méthode générique pour envoyer des messages
  sendMessage(message: { event: string; payload: any }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Méthode pour supprimer un écouteur d'événement
  off(event: string, handler: EventHandler): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  private _emit(event: string, payload: any) {
    const set = this.handlers.get(event);
    if (!set) return;
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


