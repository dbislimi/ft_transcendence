import WebSocket from 'ws';
import { ErrorCode } from './types.ts';
import type { TypedError } from './types.ts';
import { bombPartyLogger } from './log.ts';

export interface WSConnection {
  socket: WebSocket;
  playerId?: string;
  roomId?: string;
  userId?: number; // JWT user ID
  lastPong: number;
  heartbeatInterval?: NodeJS.Timeout;
  messageCounts?: Map<string, { count: number; resetAt: number }>; // Rate limiting per message type
}

export class BombPartyWSServer {
  private connections = new Map<WebSocket, WSConnection>();
  private readonly PING_INTERVAL = 28000; // ~28s pour ping toutes les 25-30s
  private readonly PONG_TIMEOUT = 10000; // 10s timeout comme spécifié

  constructor() {
    this.startHeartbeatInterval();
  }

  private startHeartbeatInterval(): void {
    setInterval(() => {
      this.sendPingToAll();
    }, this.PING_INTERVAL);
  }

  private sendPingToAll(): void {
    const now = Date.now();
    
    for (const [socket, connection] of this.connections) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.ping();
          connection.lastPong = now;
        } catch (error) {
          bombPartyLogger.error({ error }, 'Ping error');
          this.closeConnection(socket, 'PING_ERROR');
        }
      }
    }

    setTimeout(() => {
      this.checkPongTimeouts();
    }, this.PONG_TIMEOUT);
  }

  private checkPongTimeouts(): void {
    const now = Date.now();
    
    for (const [socket, connection] of this.connections) {
      if (socket.readyState === WebSocket.OPEN) {
        const timeSinceLastPong = now - connection.lastPong;
        if (timeSinceLastPong > this.PONG_TIMEOUT) {
          bombPartyLogger.warn({ 
            playerId: connection.playerId, 
            timeSinceLastPong 
          }, 'Pong timeout, closing connection');
          this.closeConnection(socket, 'PONG_TIMEOUT');
        }
      }
    }
  }

  registerConnection(socket: WebSocket, playerId?: string, roomId?: string, userId?: number): void {
    const connection: WSConnection = {
      socket,
      playerId,
      roomId,
      userId,
      lastPong: Date.now(),
      messageCounts: new Map()
    };

    this.connections.set(socket, connection);

    socket.on('pong', () => {
      const conn = this.connections.get(socket);
      if (conn) {
        conn.lastPong = Date.now();
      }
    });

    socket.on('close', () => {
      this.connections.delete(socket);
    });

    socket.on('error', (error) => {
      bombPartyLogger.error({ error }, 'WebSocket error');
      this.connections.delete(socket);
    });
  }

  updateConnection(socket: WebSocket, playerId?: string, roomId?: string, userId?: number): void {
    const connection = this.connections.get(socket);
    if (connection) {
      connection.playerId = playerId;
      connection.roomId = roomId;
      if (userId !== undefined) {
        connection.userId = userId;
      }
    }
  }

  closeConnection(socket: WebSocket, reason: string): void {
    const connection = this.connections.get(socket);
    if (connection) {
      bombPartyLogger.info({ 
        playerId: connection.playerId, 
        roomId: connection.roomId, 
        reason 
      }, 'Closing connection');
      this.connections.delete(socket);
      
      if (connection.heartbeatInterval) {
        clearInterval(connection.heartbeatInterval);
      }
      
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1008, reason); // 1008 = Policy Violation
      }
    }
  }

  sendError(socket: WebSocket, error: string, code: ErrorCode = ErrorCode.STATE_ERROR): void {
    const message: TypedError = {
      t: 'error',
      code,
      msg: error
    };
    
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    } catch (err) {
      bombPartyLogger.error({ error: err }, 'Error sending error message');
    }
  }

  sendMessage(socket: WebSocket, message: any): void {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    } catch (err) {
      bombPartyLogger.error({ error: err }, 'Error sending message');
    }
  }

  /**
   * Vérifie le rate limiting pour un type de message
   * @param socket La connexion WebSocket
   * @param messageType Le type de message (ex: 'bp:game:input', 'bp:chat:message')
   * @param maxMessages Nombre maximum de messages autorisés
   * @param windowMs Fenêtre de temps en ms (par défaut 2000ms = 2s)
   * @returns true si le message est autorisé, false si rate limit dépassé
   */
  checkRateLimit(
    socket: WebSocket, 
    messageType: string, 
    maxMessages: number = 10, 
    windowMs: number = 2000
  ): boolean {
    const connection = this.connections.get(socket);
    if (!connection) return false;

    if (!connection.messageCounts) {
      connection.messageCounts = new Map();
    }

    const now = Date.now();
    const countInfo = connection.messageCounts.get(messageType);
    
    if (!countInfo || now >= countInfo.resetAt) {
      // Nouvelle fenêtre ou fenêtre expirée
      connection.messageCounts.set(messageType, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (countInfo.count >= maxMessages) {
      // Rate limit dépassé
      bombPartyLogger.warn({ 
        playerId: connection.playerId, 
        messageType, 
        count: countInfo.count 
      }, 'Rate limit exceeded');
      return false;
    }

    // Incrémenter le compteur
    countInfo.count++;
    return true;
  }

  broadcastToAll(message: any): void {
    for (const [socket] of this.connections) {
      this.sendMessage(socket, message);
    }
  }

  getConnection(socket: WebSocket): WSConnection | undefined {
    return this.connections.get(socket);
  }

  cleanup(): void {
    for (const [socket] of this.connections) {
      this.closeConnection(socket, 'SERVER_SHUTDOWN');
    }
    this.connections.clear();
  }
}
