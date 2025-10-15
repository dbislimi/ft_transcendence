import { BombPartyEngine } from '../src/modules/bombparty/GameEngine';

describe('BombPartyEngine', () => {
  let engine: BombPartyEngine;

  beforeEach(() => {
    engine = new BombPartyEngine();
  });

  describe('submitWord', () => {
    beforeEach(() => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      engine.initializeGame(players);
      engine.startCountdown();
      engine.startTurn();
    });

    it('should refuse if trigram is missing', () => {
      const result = engine.submitWord('', 1000);
      expect(result.ok).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should refuse if player is not active', () => {
      // Force change to next player
      engine.resolveTurn(false, false);
      const result = engine.submitWord('test', 1000);
      expect(result.ok).toBe(false);
    });

    it('should refuse if word already used', () => {
      const state = engine.getState();
      const result1 = engine.submitWord('test', 1000);
      if (result1.ok) {
        engine.resolveTurn(true, false);
        engine.startTurn();
        const result2 = engine.submitWord('test', 1000);
        expect(result2.ok).toBe(false);
      }
    });

    it('should accept valid word', () => {
      const result = engine.submitWord('test', 1000);
      expect(result.ok).toBe(true);
    });
  });

  describe('turn timing', () => {
    beforeEach(() => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      engine.initializeGame(players);
      engine.startCountdown();
      engine.startTurn();
    });

    it('should end turn when time expires', () => {
      const state = engine.getState();
      const originalTurnStartedAt = state.turnStartedAt;
      
      // Mock Date.now to simulate time passage
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalTurnStartedAt + state.turnDurationMs + 1000);
      
      const wasExpired = engine.checkAndEndExpiredTurn();
      expect(wasExpired).toBe(true);
      
      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should not end turn before time expires', () => {
      const wasExpired = engine.checkAndEndExpiredTurn();
      expect(wasExpired).toBe(false);
    });
  });

  describe('game flow', () => {
    it('should initialize game correctly', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      const state = engine.getState();
      
      expect(state.players).toHaveLength(2);
      expect(state.phase).toBe('COUNTDOWN');
      expect(state.currentPlayerId).toBe('player1');
    });

    it('should handle turn progression', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      engine.startCountdown();
      engine.startTurn();
      
      const state1 = engine.getState();
      expect(state1.currentPlayerId).toBe('player1');
      
      engine.resolveTurn(false, false);
      const state2 = engine.getState();
      expect(state2.currentPlayerId).toBe('player2');
    });
  });
});
