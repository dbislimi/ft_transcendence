type BonusKey = 'inversion' | 'plus5sec' | 'vitesseEclair' | 'doubleChance';

type EventHandler = (payload: any) => void;

export interface BonusActivatePayload {
  roomId: string;
  playerId: string;
  bonusKey: BonusKey;
}

export interface BombPartyClientOptions {
  mock?: boolean; // if true, echo server events locally for dev
}

export class BombPartyClient {
  private mock: boolean;
  private handlers: Map<string, Set<EventHandler>> = new Map();

  constructor(options: BombPartyClientOptions = {}) {
    this.mock = options.mock ?? true;
  }

  on(event: 'bonus:applied', handler: EventHandler): () => void;
  on(event: string, handler: EventHandler): () => void {
    const set = this.handlers.get(event) ?? new Set<EventHandler>();
    set.add(handler);
    this.handlers.set(event, set);
    return () => {
      set.delete(handler);
    };
  }

  emit(event: 'bonus:activate', payload: BonusActivatePayload): void;
  emit(event: string, payload: any): void {
    // TODO: integrate with real socket when backend is ready
    if (this.mock) {
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


