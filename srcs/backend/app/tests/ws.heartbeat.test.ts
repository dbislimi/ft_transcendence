import { BombPartyWSServer } from '../src/modules/bombparty/wsServer';

// Mock WebSocket
class MockWebSocket {
  public readyState = 1; // OPEN
  public onclose: ((code: number, reason: Buffer) => void) | null = null;
  public onerror: ((error: Error) => void) | null = null;
  public onpong: (() => void) | null = null;
  
  private _pingCalled = false;
  private _closeCalled = false;
  
  ping(): void {
    this._pingCalled = true;
    // Simulate pong response
    setTimeout(() => {
      if (this.onpong) {
        this.onpong();
      }
    }, 100);
  }
  
  close(code?: number, reason?: string): void {
    this._closeCalled = true;
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(code || 1000, Buffer.from(reason || ''));
    }
  }
  
  send(data: string): void {
    // Mock implementation
  }
  
  get pingCalled(): boolean {
    return this._pingCalled;
  }
  
  get closeCalled(): boolean {
    return this._closeCalled;
  }
}

describe('BombPartyWSServer', () => {
  let wsServer: BombPartyWSServer;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    wsServer = new BombPartyWSServer();
    mockWs = new MockWebSocket();
  });

  afterEach(() => {
    wsServer.cleanup();
  });

  describe('connection management', () => {
    it('should register connection', () => {
      wsServer.registerConnection(mockWs as any, 'player1', 'room1');
      
      const connection = wsServer.getConnection(mockWs as any);
      expect(connection).toBeDefined();
      expect(connection?.playerId).toBe('player1');
      expect(connection?.roomId).toBe('room1');
    });

    it('should update connection', () => {
      wsServer.registerConnection(mockWs as any);
      wsServer.updateConnection(mockWs as any, 'player1', 'room1');
      
      const connection = wsServer.getConnection(mockWs as any);
      expect(connection?.playerId).toBe('player1');
      expect(connection?.roomId).toBe('room1');
    });

    it('should close connection', () => {
      wsServer.registerConnection(mockWs as any, 'player1', 'room1');
      wsServer.closeConnection(mockWs as any, 'TEST_REASON');
      
      expect(mockWs.closeCalled).toBe(true);
      expect(wsServer.getConnection(mockWs as any)).toBeUndefined();
    });
  });

  describe('heartbeat', () => {
    it('should send ping to all connections', (done) => {
      wsServer.registerConnection(mockWs as any, 'player1', 'room1');
      
      // Wait for heartbeat interval
      setTimeout(() => {
        expect(mockWs.pingCalled).toBe(true);
        done();
      }, 16000); // Slightly more than PING_INTERVAL
    });

    it('should close connection on pong timeout', (done) => {
      const noPongWs = new MockWebSocket();
      // Override ping to not send pong
      noPongWs.ping = () => {
        // Do nothing - simulate no pong response
      };
      
      wsServer.registerConnection(noPongWs as any, 'player1', 'room1');
      
      // Wait for ping + timeout
      setTimeout(() => {
        expect(noPongWs.closeCalled).toBe(true);
        done();
      }, 22000); // PING_INTERVAL + PONG_TIMEOUT + buffer
    });

    it('should not close connection with valid pong', (done) => {
      wsServer.registerConnection(mockWs as any, 'player1', 'room1');
      
      // Wait for ping + timeout
      setTimeout(() => {
        expect(mockWs.closeCalled).toBe(false);
        done();
      }, 22000); // PING_INTERVAL + PONG_TIMEOUT + buffer
    });
  });

  describe('message sending', () => {
    it('should send error message', () => {
      const sendSpy = jest.spyOn(mockWs, 'send');
      wsServer.registerConnection(mockWs as any);
      
      wsServer.sendError(mockWs as any, 'Test error', 'VALIDATION_ERROR' as any);
      
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          t: 'error',
          code: 'VALIDATION_ERROR',
          msg: 'Test error'
        })
      );
    });

    it('should send regular message', () => {
      const sendSpy = jest.spyOn(mockWs, 'send');
      wsServer.registerConnection(mockWs as any);
      
      wsServer.sendMessage(mockWs as any, { test: 'message' });
      
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ test: 'message' }));
    });

    it('should not send to closed connection', () => {
      const sendSpy = jest.spyOn(mockWs, 'send');
      mockWs.readyState = 3; // CLOSED
      wsServer.registerConnection(mockWs as any);
      
      wsServer.sendMessage(mockWs as any, { test: 'message' });
      
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });
});
