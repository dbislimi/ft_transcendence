import WebSocket from 'ws';
import { ErrorCode } from './types.ts';
import type { TypedError } from './types.ts';

export interface WSConnection {
  socket: WebSocket;
  playerId?: string;
  roomId?: string;
  lastPong: number;
  heartbeatInterval?: NodeJS.Timeout;
}

export class BombPartyWSServer {
  private connections = new Map<WebSocket, WSConnection>();
  private readonly PING_INTERVAL = 30000;
  private readonly PONG_TIMEOUT = 45000;

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
          console.error('[BombParty] Ping error:', error);
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
        if (now - connection.lastPong > this.PONG_TIMEOUT) {
          this.closeConnection(socket, 'PONG_TIMEOUT');
        }
      }
    }
  }

  registerConnection(socket: WebSocket, playerId?: string, roomId?: string): void {
    const connection: WSConnection = {
      socket,
      playerId,
      roomId,
      lastPong: Date.now()
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
      console.error('[BombParty] WebSocket error:', error);
      this.connections.delete(socket);
    });
  }

  updateConnection(socket: WebSocket, playerId?: string, roomId?: string): void {
    const connection = this.connections.get(socket);
    if (connection) {
      connection.playerId = playerId;
      connection.roomId = roomId;
    }
  }

  closeConnection(socket: WebSocket, reason: string): void {
    const connection = this.connections.get(socket);
    if (connection) {
      console.log(`[BombParty] Fermeture connexion: ${reason}`);
      this.connections.delete(socket);
      
      if (connection.heartbeatInterval) {
        clearInterval(connection.heartbeatInterval);
      }
      
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000, reason);
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
      console.error('[BombParty] Error sending message:', err);
    }
  }

  sendMessage(socket: WebSocket, message: any): void {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    } catch (err) {
      console.error('[BombParty] Error sending message:', err);
    }
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
