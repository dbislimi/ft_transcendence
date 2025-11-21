import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BombPartyWSServer } from '../../modules/bombparty/wsServer.ts';

describe('BombParty Rate Limiting', () => {
  let wsServer: BombPartyWSServer;
  let mockSocket: any;

  beforeEach(() => {
    wsServer = new BombPartyWSServer();
    
    mockSocket = {
      readyState: 1,
      on: jest.fn(),
      ping: jest.fn(),
      close: jest.fn(),
      send: jest.fn()
    };
  });

  it('should allow messages within rate limit', () => {
    wsServer.registerConnection(mockSocket);
    
    for (let i = 0; i < 5; i++) {
      const allowed = wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 2000);
      expect(allowed).toBe(true);
    }
  });

  it('should block messages exceeding rate limit', () => {
    wsServer.registerConnection(mockSocket);
    
    for (let i = 0; i < 10; i++) {
      wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 2000);
    }
    
    const allowed = wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 2000);
    expect(allowed).toBe(false);
  });

  it('should reset rate limit after window expires', (done) => {
    wsServer.registerConnection(mockSocket);
    
    for (let i = 0; i < 10; i++) {
      wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 100);
    }
    
    expect(wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 100)).toBe(false);
    
    setTimeout(() => {
      const allowed = wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 100);
      expect(allowed).toBe(true);
      done();
    }, 150);
  });

  it('should handle different message types independently', () => {
    wsServer.registerConnection(mockSocket);
    
    for (let i = 0; i < 10; i++) {
      wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 2000);
    }
    
    const allowed = wsServer.checkRateLimit(mockSocket, 'bp:bonus:activate', 10, 2000);
    expect(allowed).toBe(true);
  });

  it('should return false for non-existent socket', () => {
    const fakeSocket = {} as any;
    const allowed = wsServer.checkRateLimit(fakeSocket, 'bp:game:input', 10, 2000);
    expect(allowed).toBe(false);
  });
});

