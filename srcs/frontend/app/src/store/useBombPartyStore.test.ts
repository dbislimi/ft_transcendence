import { useBombPartyStore } from './useBombPartyStore';

declare global {
  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => void): void;
  function beforeEach(fn: () => void): void;
  function expect(value: any): any;
}

describe('useBombPartyStore', () => {
  beforeEach(() => {
    useBombPartyStore.setState({
      gamePhase: 'RULES',
      gameState: null,
      ui: {
        wordJustSubmitted: false,
        turnInProgress: false,
        timerGracePeriod: false,
        timerFlash: false,
        profilePlayerId: null,
        infoOpen: false
      },
      connection: {
        state: 'disconnected',
        playerId: null,
        roomId: null,
        isHost: false,
        lobbyPlayers: [],
        lobbyMaxPlayers: 4,
        isAuthenticating: true,
        reconnectAttempts: 0,
        lastError: null
      }
    });
  });

  describe('game phase management', () => {
    it('should set game phase', () => {
      useBombPartyStore.getState().setGamePhase('GAME');
      expect(useBombPartyStore.getState().gamePhase).toBe('GAME');
    });
  });

  describe('server state handling', () => {
    it('should receive server state', () => {
      const mockGameState = {
        phase: 'TURN_ACTIVE' as const,
        players: [
          { id: 'player1', name: 'Player 1', lives: 3, isEliminated: false, streak: 0, bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 } }
        ],
        currentPlayerIndex: 0,
        currentPlayerId: 'player1',
        currentSyllable: 'abc',
        usedWords: [],
        turnStartedAt: Date.now(),
        turnDurationMs: 15000,
        turnOrder: ['player1'],
        turnDirection: 1 as const,
        baseTurnSeconds: 15,
        history: []
      };

      useBombPartyStore.getState().receiveServerState(mockGameState);
      expect(useBombPartyStore.getState().gameState).toEqual(mockGameState);
    });

    it('should handle turn started event', () => {
      const mockGameState = {
        phase: 'LOBBY' as const,
        players: [
          { id: 'player1', name: 'Player 1', lives: 3, isEliminated: false, streak: 0, bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 } }
        ],
        currentPlayerIndex: 0,
        currentPlayerId: 'player1',
        currentSyllable: 'abc',
        usedWords: [],
        turnStartedAt: 0,
        turnDurationMs: 15000,
        turnOrder: ['player1'],
        turnDirection: 1 as const,
        baseTurnSeconds: 15,
        history: []
      };

      useBombPartyStore.getState().receiveServerState(mockGameState);
      
      const turnStartedAt = Date.now();
      const turnDurationMs = 10000;
      const currentPlayerId = 'player1';
      
      useBombPartyStore.getState().handleTurnStarted(turnStartedAt, turnDurationMs, currentPlayerId);
      
      const state = useBombPartyStore.getState().gameState;
      expect(state?.turnStartedAt).toBe(turnStartedAt);
      expect(state?.turnDurationMs).toBe(turnDurationMs);
      expect(state?.currentPlayerId).toBe(currentPlayerId);
      expect(state?.phase).toBe('TURN_ACTIVE');
    });
  });

  describe('connection management', () => {
    it('should set connection state', () => {
      useBombPartyStore.getState().setConnectionState('connected');
      expect(useBombPartyStore.getState().connection.state).toBe('connected');
    });

    it('should set player ID', () => {
      useBombPartyStore.getState().setPlayerId('player123');
      expect(useBombPartyStore.getState().connection.playerId).toBe('player123');
    });

    it('should set room ID', () => {
      useBombPartyStore.getState().setRoomId('room456');
      expect(useBombPartyStore.getState().connection.roomId).toBe('room456');
    });
  });

  describe('computed getters', () => {
    it('should get current player', () => {
      const mockGameState = {
        phase: 'TURN_ACTIVE' as const,
        players: [
          { id: 'player1', name: 'Player 1', lives: 3, isEliminated: false, streak: 0, bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 } },
          { id: 'player2', name: 'Player 2', lives: 2, isEliminated: false, streak: 1, bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 } }
        ],
        currentPlayerIndex: 1,
        currentPlayerId: 'player2',
        currentSyllable: 'def',
        usedWords: [],
        turnStartedAt: Date.now(),
        turnDurationMs: 15000,
        turnOrder: ['player1', 'player2'],
        turnDirection: 1 as const,
        baseTurnSeconds: 15,
        history: []
      };

      useBombPartyStore.getState().receiveServerState(mockGameState);
      
      const currentPlayer = useBombPartyStore.getState().getCurrentPlayer();
      expect(currentPlayer?.id).toBe('player2');
      expect(currentPlayer?.name).toBe('Player 2');
    });

    it('should check if it is my turn', () => {
      const mockGameState = {
        phase: 'TURN_ACTIVE' as const,
        players: [
          { id: 'player1', name: 'Player 1', lives: 3, isEliminated: false, streak: 0, bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 } }
        ],
        currentPlayerIndex: 0,
        currentPlayerId: 'player1',
        currentSyllable: 'abc',
        usedWords: [],
        turnStartedAt: Date.now(),
        turnDurationMs: 15000,
        turnOrder: ['player1'],
        turnDirection: 1 as const,
        baseTurnSeconds: 15,
        history: []
      };

      useBombPartyStore.getState().receiveServerState(mockGameState);
      useBombPartyStore.getState().setPlayerId('player1');
      
      expect(useBombPartyStore.getState().isMyTurn()).toBe(true);
      
      useBombPartyStore.getState().setPlayerId('player2');
      expect(useBombPartyStore.getState().isMyTurn()).toBe(false);
    });

    it('should check if word can be submitted', () => {
      const mockGameState = {
        phase: 'TURN_ACTIVE' as const,
        players: [
          { id: 'player1', name: 'Player 1', lives: 3, isEliminated: false, streak: 0, bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 } }
        ],
        currentPlayerIndex: 0,
        currentPlayerId: 'player1',
        currentSyllable: 'abc',
        usedWords: [],
        turnStartedAt: Date.now(),
        turnDurationMs: 15000,
        turnOrder: ['player1'],
        turnDirection: 1 as const,
        baseTurnSeconds: 15,
        history: []
      };

      useBombPartyStore.getState().receiveServerState(mockGameState);
      useBombPartyStore.getState().setPlayerId('player1');
      
      expect(useBombPartyStore.getState().canSubmitWord()).toBe(true);
      
      useBombPartyStore.getState().setWordJustSubmitted(true);
      expect(useBombPartyStore.getState().canSubmitWord()).toBe(false);
    });
  });
});
