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
    
    // Envoyer 5 messages (limite par défaut: 10)
    for (let i = 0; i < 5; i++) {
      const allowed = wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 2000);
      expect(allowed).toBe(true);
    }
  });

  it('should block messages exceeding rate limit', () => {
    wsServer.registerConnection(mockSocket);
    
    // Envoyer 11 messages (limite: 10)
    for (let i = 0; i < 10; i++) {
      wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 2000);
    }
    
    // Le 11ème devrait être bloqué
    const allowed = wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 2000);
    expect(allowed).toBe(false);
  });

  it('should reset rate limit after window expires', (done) => {
    wsServer.registerConnection(mockSocket);
    
    // Atteindre la limite
    for (let i = 0; i < 10; i++) {
      wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 100); // 100ms window
    }
    
    // Vérifier que c'est bloqué
    expect(wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 100)).toBe(false);
    
    // Attendre que la fenêtre expire
    setTimeout(() => {
      const allowed = wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 100);
      expect(allowed).toBe(true); // Devrait être réinitialisé
      done();
    }, 150);
  });

  it('should handle different message types independently', () => {
    wsServer.registerConnection(mockSocket);
    
    // Atteindre la limite pour un type
    for (let i = 0; i < 10; i++) {
      wsServer.checkRateLimit(mockSocket, 'bp:game:input', 10, 2000);
    }
    
    // Un autre type devrait toujours être autorisé
    const allowed = wsServer.checkRateLimit(mockSocket, 'bp:bonus:activate', 10, 2000);
    expect(allowed).toBe(true);
  });

  it('should return false for non-existent socket', () => {
    const fakeSocket = {} as any;
    const allowed = wsServer.checkRateLimit(fakeSocket, 'bp:game:input', 10, 2000);
    expect(allowed).toBe(false);
  });
});

