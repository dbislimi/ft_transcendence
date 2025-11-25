import type { BonusKey } from '../../game-bomb-party/core/types';
import { wsCoordinator } from './WebSocketCoordinator';
import { logger } from '../../utils/logger';
import type { BPClientMessage, BPServerMessage, WSMessage } from './types';
import { isBPServerMessage } from './types';
import { getWebSocketHost } from '../../config/api';

type EventHandler = (payload: unknown) => void;

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
  | 'bp:pong'
  | 'bp:lobby:list'
  | 'connected'
  | 'disconnected'
  | 'error'
  | string;

export interface BombPartyClientOptions {
  mock?: boolean;
  priority?: number;
  maxReconnectAttempts?: number;
  reconnectBaseDelay?: number;
  reconnectMaxDelay?: number;
  messageQueueMaxSize?: number;
  messageExpirationMs?: number;
}

interface QueuedMessage {
  event: string;
  payload: unknown;
  timestamp: number;
  expiresAt: number;
  priority: number;
}

export class BombPartyClient {
  private mock: boolean;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private ws: WebSocket | null = null;
  private connectionId: string = '';
  private isConnecting: boolean = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number;
  private reconnectBaseDelay: number;
  private reconnectMaxDelay: number;
  private priority: number;
  private registeredWithCoordinator: boolean = false;
  private authenticated: boolean = false;
  private connectionLock: boolean = false;
  private messageQueue: QueuedMessage[] = [];
  private messageQueueMaxSize: number;
  private messageExpirationMs: number;
  private cleanupCallbacks: Array<() => void> = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentPlayerName: string | null = null;
  private nonPriorityAttempts: number = 0;
  private maxNonPriorityAttempts: number = 3;
  private shouldStopReconnecting: boolean = false;
  private isCleaningUp: boolean = false;
  private isDisconnecting: boolean = false;
  private isDisconnected: boolean = false;
  private hasLoggedReconnectionStopped: boolean = false; // Flag pour logger seulement une fois

  constructor(options: BombPartyClientOptions = {}) {
    this.mock = options.mock ?? false;
    this.connectionId = `bpc_${Math.random().toString(36).substring(2, 10)}`;
    this.priority = options.priority ?? 20;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.reconnectBaseDelay = options.reconnectBaseDelay ?? 1000;
    this.reconnectMaxDelay = options.reconnectMaxDelay ?? 30000;
    this.messageQueueMaxSize = options.messageQueueMaxSize ?? 100;
    this.messageExpirationMs = options.messageExpirationMs ?? 60000;

    logger.debug('websocket client created', { connectionId: this.connectionId, priority: this.priority });
  }

  private isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      return Date.now() < expiresAt;
    } catch {
      return false;
    }
  }

  private getWebSocketUrl(): string {
    const token = localStorage.getItem('token');

    // Always prefer Nginx proxy (port 443) over direct backend port (3001)
    // If on port 5173 (Vite), target localhost (Nginx).
    // If on port 443 (Nginx), target window.location.host.
    const wsHost = getWebSocketHost();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${wsHost}/bombparty/ws`;

    const url = new URL(wsUrl);
    if (token) {
      url.searchParams.set('token', token);
    }
    return url.toString();
  }

  private calculateReconnectDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      this.reconnectBaseDelay * Math.pow(2, attempt),
      this.reconnectMaxDelay
    );
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }

  private cleanup(): void {
    if (this.isCleaningUp) {
      logger.debug(`[BombPartyClient] Cleanup already in progress, skipping [${this.connectionId}]`);
      return;
    }

    this.isCleaningUp = true;
    logger.debug(`[BombPartyClient] Starting cleanup [${this.connectionId}]`);

    try {
      if (this.reconnectTimer !== null) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (this.pingInterval !== null) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      if (this.connectionTimeout !== null) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      for (const cleanup of this.cleanupCallbacks) {
        try {
          cleanup();
        } catch (err) {
          logger.error(`[BombPartyClient] Error in cleanup callback:`, err);
        }
      }
      this.cleanupCallbacks = [];

      if (this.ws) {
        try {
          this.ws.onopen = null;
          this.ws.onclose = null;
          this.ws.onerror = null;
          this.ws.onmessage = null;
        } catch (err) {
          logger.warn('error cleaning up websocket handlers', { connectionId: this.connectionId, error: err });
        }
      }

      logger.debug(`[BombPartyClient] Cleanup completed [${this.connectionId}]`);
    } finally {
      this.isCleaningUp = false;
    }
  }

  public connect(): void {
    if (this.shouldStopReconnecting) {
      logger.error(`[BombPartyClient] Reconnection permanently stopped - max attempts reached [${this.connectionId}]`, {
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.maxReconnectAttempts,
        nonPriorityAttempts: this.nonPriorityAttempts,
        maxNonPriorityAttempts: this.maxNonPriorityAttempts
      });
      logger.warn(`[BombPartyClient] Call reset() method to allow reconnection attempts again [${this.connectionId}]`);
      return;
    }

    if (this.isDisconnected) {
      this.isDisconnected = false;
      logger.debug(`[BombPartyClient] Resetting isDisconnected flag [${this.connectionId}]`);
    }

    if (this.connectionLock) {
      logger.debug(`[BombPartyClient] Connection lock active, ignoring connect request [${this.connectionId}]`);
      return;
    }

    if (this.isConnecting || (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN))) {
      logger.debug(`[BombPartyClient] Connection already in progress or active, ignored [${this.connectionId}]`);
      return;
    }

    const connectionsInfo = wsCoordinator.getConnectionsInfo();

    this.registeredWithCoordinator = wsCoordinator.registerConnection(
      this.connectionId,
      'bombPartyClient',
      this.priority
    );

    if (!this.registeredWithCoordinator) {
      this.nonPriorityAttempts++;

      const hasActiveService = connectionsInfo.allConnections.some(
        c => c.type === 'bombPartyService' && c.isActive
      );

      logger.warn(`[BombPartyClient] Not priority for now (attempt ${this.nonPriorityAttempts}/${this.maxNonPriorityAttempts}) [${this.connectionId}]`, {
        currentPrimary: connectionsInfo.primaryConnection,
        activeConnections: connectionsInfo.activeCount,
        allConnections: connectionsInfo.allConnections,
        myPriority: this.priority,
        hasActiveService
      });

      if (this.nonPriorityAttempts >= this.maxNonPriorityAttempts) {
        if (hasActiveService) {
          logger.error(`[BombPartyClient] Max non-priority attempts reached (${this.maxNonPriorityAttempts}), stopping reconnection [${this.connectionId}] - BombPartyService is active`);
          this.shouldStopReconnecting = true;
          this.stopReconnectingAndCleanQueue();
          this._emit('error', { error: 'Not priority, connection abandoned after max attempts - BombPartyService is active' });
          return;
        } else {
          logger.warn(`[BombPartyClient] Max non-priority attempts reached but no BombPartyService active, will retry with longer delay [${this.connectionId}]`);
          const delay = this.calculateReconnectDelay(this.maxNonPriorityAttempts);
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.nonPriorityAttempts = 0; // Réinitialiser pour une nouvelle série de tentatives
            this.connect();
          }, delay);
          return;
        }
      }

      const delay = this.calculateReconnectDelay(this.nonPriorityAttempts - 1);
      logger.debug(`[BombPartyClient] Scheduling non-priority retry in ${Math.round(delay)}ms [${this.connectionId}]`);

      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, delay);

      return;
    }

    this.nonPriorityAttempts = 0;

    this.connectionLock = true;
    this.isConnecting = true;
    logger.debug(`[BombPartyClient] WebSocket connection attempt... [${this.connectionId}]`);

    try {
      const wsUrl = this.getWebSocketUrl();
      logger.debug(`[BombPartyClient] Connecting to: ${wsUrl.replace(/token=[^&]+/, 'token=***')}`);
      this.ws = new WebSocket(wsUrl);

      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          logger.warn(`[BombPartyClient] Connection timeout [${this.connectionId}]`);
          this.ws.close();
          this.handleConnectionFailure();
        }
      }, 10000);

      this.ws.onopen = () => {
        this.connectionLock = false;
        this.isConnecting = false;

        this.reconnectAttempts = 0;
        this.nonPriorityAttempts = 0;

        if (this.shouldStopReconnecting) {
          logger.debug(`[BombPartyClient] Connection successful, resetting shouldStopReconnecting flag [${this.connectionId}]`);
          this.shouldStopReconnecting = false;
          this.hasLoggedReconnectionStopped = false;
        }

        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        logger.debug(`[BombPartyClient] Connexion établie [${this.connectionId}]`);

        this.startPingInterval();

        this._emit('connected', {});
      };

      this.ws.onmessage = (event) => {
        if (!wsCoordinator.isPrimaryConnection(this.connectionId)) {
          logger.debug(`[BombPartyClient] Not priority, message ignored [${this.connectionId}]`);
          return;
        }

        try {
          const rawData = JSON.parse(event.data) as WSMessage;

          if (!isBPServerMessage(rawData)) {
            logger.warn(`[BombPartyClient] Invalid message format received:`, {
              connectionId: this.connectionId,
              messageType: typeof rawData,
              hasEvent: 'event' in (rawData || {}),
              eventValue: (rawData as any)?.event,
              rawData: rawData
            });
            return;
          }

          const data = rawData as BPServerMessage;

          if (data.event === 'bp:ping') {
            this.sendMessageDirectly('bp:pong', {});
            return;
          }

          if (data.event !== 'bp:pong') {
            logger.debug('[BombPartyClient] Message received:', {
              event: data.event,
              connectionId: this.connectionId
            });
          }

          this._emit(data.event, data.payload);
        } catch (err) {
          logger.error('[BombPartyClient] Error parsing message:', err);
        }
      };

      this.ws.onclose = (event) => {
        this.connectionLock = false;
        this.isConnecting = false;

        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        this.stopPingInterval();

        logger.debug(`[BombPartyClient] Connection closed [${this.connectionId}], code: ${event.code}, reason: ${event.reason || 'none'}`, {
          reconnectAttempts: this.reconnectAttempts,
          maxReconnectAttempts: this.maxReconnectAttempts,
          shouldStopReconnecting: this.shouldStopReconnecting
        });
        this._emit('disconnected', { code: event.code, reason: event.reason });

        if (this.shouldStopReconnecting) {
          logger.error(`[BombPartyClient] Connection closed but reconnection permanently stopped [${this.connectionId}]`, {
            code: event.code,
            reason: event.reason || 'none',
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
          });
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
            logger.debug(`[BombPartyClient] Cleared pending reconnect timer [${this.connectionId}]`);
          }
          logger.warn(`[BombPartyClient] Call reset() to allow new connection attempts [${this.connectionId}]`);
          return;
        }

        if (event.code === 1000) {
          logger.debug(`[BombPartyClient] Normal closure (code 1000), not reconnecting [${this.connectionId}]`);
          this.reconnectAttempts = 0;
          return;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = this.calculateReconnectDelay(this.reconnectAttempts);
          this.reconnectAttempts++;
          logger.debug(`[BombPartyClient] Scheduling reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms [${this.connectionId}]`);

          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, delay);
        } else {
          logger.error(`[BombPartyClient] Max reconnect attempts reached (${this.maxReconnectAttempts}), stopping permanently [${this.connectionId}]`);
          this.shouldStopReconnecting = true;
          this.stopReconnectingAndCleanQueue();

          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
            logger.debug(`[BombPartyClient] Cleared all reconnect timers [${this.connectionId}]`);
          }

          this._emit('error', { error: 'Max reconnect attempts reached' });
          logger.warn(`[BombPartyClient] Call reset() to allow new connection attempts [${this.connectionId}]`);
        }
      };

      this.ws.onerror = (error) => {
        this.connectionLock = false;
        this.isConnecting = false;
        const errorInfo = {
          type: error.type || 'unknown',
          message: 'WebSocket connection error',
          target: error.target ? (error.target instanceof WebSocket ? 'WebSocket' : String(error.target)) : 'unknown'
        };
        logger.error(`[BombPartyClient] WebSocket error [${this.connectionId}]:`, errorInfo);
        logger.error('Erreur de connexion WebSocket', errorInfo);
        this._emit('error', { error: 'WebSocket error', details: errorInfo });
        this.handleConnectionFailure();
      };
    } catch (err) {
      this.connectionLock = false;
      this.isConnecting = false;
      logger.error(`[BombPartyClient] Exception lors de la connexion [${this.connectionId}]:`, err);

      if (err instanceof Error && err.message.includes('token')) {
        logger.warn(`[BombPartyClient] Authentication error, not retrying [${this.connectionId}]`);
        return;
      }

      this.handleConnectionFailure();
    }
  }

  private handleConnectionFailure(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch (err) {
      }
      this.ws = null;
    }

    if (this.shouldStopReconnecting) {
      logger.error(`[BombPartyClient] Connection failure but reconnection permanently stopped [${this.connectionId}]`, {
        reason: 'shouldStopReconnecting flag is true',
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.maxReconnectAttempts
      });
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        logger.debug(`[BombPartyClient] Cleared pending reconnect timer [${this.connectionId}]`);
      }
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.calculateReconnectDelay(this.reconnectAttempts);
      this.reconnectAttempts++;
      logger.debug(`[BombPartyClient] Connection failed, scheduling retry ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms [${this.connectionId}]`);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, delay);
    } else {
      logger.error(`[BombPartyClient] Max reconnect attempts reached (${this.maxReconnectAttempts}), stopping permanently [${this.connectionId}]`);
      this.shouldStopReconnecting = true;
      this.stopReconnectingAndCleanQueue();

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        logger.debug(`[BombPartyClient] Cleared all reconnect timers [${this.connectionId}]`);
      }

      this._emit('error', { error: 'Max reconnect attempts reached after connection failure' });
      logger.warn(`[BombPartyClient] Call reset() to allow new connection attempts [${this.connectionId}]`);
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessageDirectly('bp:ping', {});
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public disconnect(): void {
    if (this.isDisconnecting || this.isDisconnected) {
      logger.debug(`[BombPartyClient] Disconnect already in progress or done [${this.connectionId}]`);
      return;
    }

    logger.debug(`[BombPartyClient] Disconnect requested [${this.connectionId}]`);
    this.isDisconnecting = true;

    this.reconnectAttempts = this.maxReconnectAttempts;
    this.shouldStopReconnecting = true;
    this.stopReconnectingAndCleanQueue();

    this.cleanup();

    if (this.registeredWithCoordinator) {
      wsCoordinator.unregisterConnection(this.connectionId);
      this.registeredWithCoordinator = false;
    }

    if (this.ws) {
      try {
        logger.debug(`[BombPartyClient] WebSocket disconnection [${this.connectionId}]`);
        this.ws.close(1000, "Normal closure");
      } catch (err) {
        logger.warn('error closing websocket', { connectionId: this.connectionId, error: err });
      }

      this.ws = null;
    }

    this.isConnecting = false;
    this.authenticated = false;
    this.connectionLock = false;
    this.nonPriorityAttempts = 0;
    this.isDisconnecting = false;
    this.isDisconnected = true;

    this.messageQueue = [];
  }

  public reset(): void {
    logger.debug(`[BombPartyClient] Reset requested [${this.connectionId}]`);

    this.reconnectAttempts = 0;
    this.nonPriorityAttempts = 0;
    this.shouldStopReconnecting = false;
    this.hasLoggedReconnectionStopped = false;
    this.authenticated = false;
    this.connectionLock = false;
    this.isDisconnected = false;

    logger.debug(`[BombPartyClient] Reset completed, client can reconnect [${this.connectionId}]`);
  }

  on(event: 'bonus:applied', handler: EventHandler): () => void;
  on(event: 'bp:bonus:applied', handler: EventHandler): () => void;
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
  on(event: 'disconnected', handler: EventHandler): () => void;
  on(event: 'error', handler: EventHandler): () => void;
  on(event: string, handler: EventHandler): () => void {
    const set = this.handlers.get(event) ?? new Set<EventHandler>();
    set.add(handler);
    this.handlers.set(event, set);

    const unsubscribe = () => {
      const currentSet = this.handlers.get(event);
      if (currentSet) {
        currentSet.delete(handler);
        if (currentSet.size === 0) {
          this.handlers.delete(event);
        }
      }
    };

    this.cleanupCallbacks.push(unsubscribe);

    return unsubscribe;
  }

  private getMessagePriority(event: string): number {
    if (event === 'bp:auth' || event === 'bp:ping' || event === 'bp:pong') {
      return 10;
    }
    if (event === 'bp:game:input' || event === 'bp:bonus:activate') {
      return 5;
    }
    return 1;
  }

  private stopReconnectingAndCleanQueue(): void {
    const queueLength = this.messageQueue.length;
    if (queueLength > 0) {
      if (!this.hasLoggedReconnectionStopped) {
        logger.warn(`[BombPartyClient] Reconnection stopped - clearing message queue (${queueLength} messages) [${this.connectionId}]`, {
          message: 'Call reset() to re-enable connection attempts'
        });
        this.hasLoggedReconnectionStopped = true;
      }
      this.messageQueue = [];
    }
  }

  private addToQueue(event: string, payload: unknown): void {
    if (this.shouldStopReconnecting) {
      return;
    }
    this.cleanExpiredMessages();

    if (this.messageQueue.length >= this.messageQueueMaxSize) {
      this.messageQueue.sort((a, b) => b.priority - a.priority);
      this.messageQueue.pop();
      logger.warn(`[BombPartyClient] Message queue full, removing least priority message [${this.connectionId}]`);
    }

    const priority = this.getMessagePriority(event);
    const timestamp = Date.now();
    const expiresAt = timestamp + this.messageExpirationMs;

    this.messageQueue.push({
      event,
      payload,
      timestamp,
      expiresAt,
      priority
    });

    this.messageQueue.sort((a, b) => b.priority - a.priority);
  }

  private cleanExpiredMessages(): void {
    const now = Date.now();
    const initialLength = this.messageQueue.length;
    this.messageQueue = this.messageQueue.filter(msg => msg.expiresAt > now);

    if (this.messageQueue.length < initialLength) {
      logger.debug(`[BombPartyClient] Removed ${initialLength - this.messageQueue.length} expired messages [${this.connectionId}]`);
    }
  }

  private sendMessageDirectly(event: string, payload: unknown): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const message = JSON.stringify({ event, payload });
      this.ws.send(message);
      if (event !== 'bp:ping' && event !== 'bp:pong') {
        logger.debug(`[BombPartyClient] Message sent to WebSocket [${this.connectionId}]:`, {
          event,
          messageLength: message.length,
          payloadPreview: event === 'bp:lobby:create' ? JSON.stringify(payload).substring(0, 100) : '...'
        });
      }
      return true;
    } catch (err) {
      logger.error(`[BombPartyClient] Error sending message [${this.connectionId}]:`, err);
      return false;
    }
  }

  emit(event: BombPartyEvent, payload: unknown): void {
    if (this.shouldStopReconnecting) {
      return;
    }

    if (event !== 'bp:ping' && event !== 'bp:pong') {
      logger.debug(`[BombPartyClient] emit called [${this.connectionId}]:`, {
        event,
        wsState: this.ws?.readyState,
        wsOpen: this.ws?.readyState === WebSocket.OPEN,
        shouldStopReconnecting: this.shouldStopReconnecting,
        payload: event === 'bp:lobby:create' ? payload : '...'
      });
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.sendMessageDirectly(event, payload)) {
        if (event !== 'bp:ping' && event !== 'bp:pong') {
          logger.debug('message sent directly', { connectionId: this.connectionId, event });
        }
        return;
      } else {
        logger.warn('failed to send message directly', { connectionId: this.connectionId, event });
      }
    }

    if (event !== 'bp:ping' && event !== 'bp:pong') {
      if (this.shouldStopReconnecting) {
        return;
      }

      logger.debug(`[BombPartyClient] WebSocket not ready, queuing message [${this.connectionId}]:`, {
        event,
        wsState: this.ws?.readyState,
        isConnecting: this.isConnecting,
        queueLength: this.messageQueue.length,
        shouldStopReconnecting: this.shouldStopReconnecting
      });
      this.addToQueue(event, payload);

      if (!this.isConnecting &&
        (!this.ws || this.ws.readyState !== WebSocket.CONNECTING) &&
        !this.shouldStopReconnecting) {
        logger.debug(`[BombPartyClient] Reconnection attempt to send message [${this.connectionId}]`);
        this.connect();
      }
    }
  }

  authenticate(playerName: string): void {
    if (this.shouldStopReconnecting) {
      return;
    }

    if (!wsCoordinator.isPrimaryConnection(this.connectionId)) {
      logger.debug(`[BombPartyClient] Not primary connection, skipping authentication [${this.connectionId}]`);
      return;
    }

    if (this.authenticated && this.currentPlayerName === playerName) {
      logger.debug(`[BombPartyClient] Already authenticated as [${playerName}], ignored [${this.connectionId}]`);
      return;
    }

    logger.debug(`[BombPartyClient] Send authentication for [${playerName}] [${this.connectionId}]`);
    this.currentPlayerName = playerName;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.debug(`[BombPartyClient] WebSocket not connected during authentication, queueing and connecting... [${this.connectionId}]`);
      this.addToQueue('bp:auth', { playerName });

      if (!this.shouldStopReconnecting) {
        this.connect();
      }
      return;
    }

    this.emit('bp:auth', { playerName });
  }

  createLobby(name: string, isPrivate: boolean, password?: string, maxPlayers: number = 4): void {
    logger.debug(`[BombPartyClient] createLobby called [${this.connectionId}]`, {
      name,
      isPrivate,
      hasPassword: !!password,
      maxPlayers,
      wsState: this.ws?.readyState,
      wsOpen: this.ws?.readyState === WebSocket.OPEN
    });
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

  sendMessage(message: { event: BombPartyEvent; payload: unknown }): void {
    if (this.shouldStopReconnecting) {
      return;
    }

    logger.debug('sendmessage', { connectionId: this.connectionId, event: message.event, wsReady: this.ws?.readyState });
    this.emit(message.event, message.payload);
  }

  off(event: string, handler: EventHandler): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  private _emit(event: string, payload: unknown): void {
    const set = this.handlers.get(event);

    if (event !== 'bp:ping' && event !== 'bp:pong') {
      logger.debug('[BombPartyClient] _emit:', {
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
        logger.error('[BombPartyClient] Handler error:', {
          event,
          error: err instanceof Error ? err.message : 'Unknown error',
          connectionId: this.connectionId
        });
      }
    }

    if (event === 'connected') {
      if (this.currentPlayerName) {
        this.messageQueue = this.messageQueue.filter(msg => msg.event !== 'bp:auth');
        this.emit('bp:auth', { playerName: this.currentPlayerName });
      }

      this._processPendingMessages();
    } else if (event === 'bp:auth:success') {
      this.authenticated = true;
      logger.debug(`[BombPartyClient] Authentication successful [${this.connectionId}]`);

      this._processPendingMessages();
    }
  }

  private _processPendingMessages(): void {
    if (this.messageQueue.length === 0) {
      return;
    }

    this.cleanExpiredMessages();

    if (this.messageQueue.length === 0) {
      return;
    }

    logger.debug(`[BombPartyClient] Processing ${this.messageQueue.length} pending messages [${this.connectionId}]`);

    const messagesToSend = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messagesToSend) {
      if (Date.now() > message.expiresAt) {
        logger.debug(`[BombPartyClient] Skipping expired message: ${message.event} [${this.connectionId}]`);
        continue;
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (this.sendMessageDirectly(message.event, message.payload)) {
          logger.debug(`[BombPartyClient] Queued message sent: ${message.event} [${this.connectionId}]`);
        } else {
          this.messageQueue.push(message);
        }
      } else {
        this.messageQueue.push(message);
      }
    }

    this.messageQueue.sort((a, b) => b.priority - a.priority);
  }

  private handleMockEvent(event: string, payload: unknown): void {
    if (!this.mock || this.ws) {
      return;
    }

    if (event === 'bp:bonus:activate') {
      const p = payload as { roomId: string; playerId: string; bonusKey: BonusKey };
      setTimeout(() => {
        this._emit('bonus:applied', {
          roomId: p.roomId,
          playerId: p.playerId,
          bonusKey: p.bonusKey,
          appliedAt: Date.now(),
        });
      }, 50);
    }
  }
}
