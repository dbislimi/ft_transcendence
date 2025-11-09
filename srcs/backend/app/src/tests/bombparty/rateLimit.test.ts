import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BombPartyWSServer } from '../../modules/bombparty/wsServer.ts';

describe('BombParty Rate Limiting', () => {
  let wsServer: BombPartyWSServer;
  let mockSocket: any;

  beforeEach(() => {
    wsServer = new BombPartyWSServer();
    
    // Mock WebSocket
    mockSocket = {
      readyState: 1, // OPEN
      on: jest.fn(),
      ping: jest.fn(),
      close: jest.fn(),
      send: jest.fn()
    };
  });

  it('should allow messages within rate limit', () => {
    wsServer.registerConnection(mockSocket);
    
    // envoyer 5 messages (limite par defaut: 10)
    for (let i = 0; i < 5; i++) {
      const allowed = wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 2000);
      expect(allowed).toBe(true);
    }
  });

  it('should block messages exceeding rate limit', () => {
    wsServer.registerConnection(mockSocket);
    
    // envoyer 11 messages (limite: 10)
    for (let i = 0; i < 10; i++) {
      wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 2000);
    }
    
    // le 11eme devrait etre bloque
    const allowed = wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 2000);
    expect(allowed).toBe(false);
  });

  it('should reset rate limit after window expires', (done) => {
    wsServer.registerConnection(mockSocket);
    
    // atteindre la limite
    for (let i = 0; i < 10; i++) {
      wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 100); // 100ms window
    }
    
    // verifier que c'est bloque
    expect(wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 100)).toBe(false);
    
    // attendre que la fenetre expire
    setTimeout(() => {
      const allowed = wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 100);
      expect(allowed).toBe(true); // devrait etre reinitialise
      done();
    }, 150);
  });

  it('should handle different message types independently', () => {
    wsServer.registerConnection(mockSocket);
    
    // atteindre la limite pour un type
    for (let i = 0; i < 10; i++) {
      wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 2000);
    }
    
    // un autre type devrait toujours etre autorise
    const allowed = wsServer.checkRateLimit(mockSocket, 'bp:bonus:activate', 10, 2000);
    expect(allowed).toBe(true);
  });

  it('should return false for non-existent socket', () => {
    const fakeSocket = {} as any;
    const allowed = wsServer.checkRateLimit(fakeSocket, 'bp:game:input', 10, 2000);
    expect(allowed).toBe(false);
  });
});

