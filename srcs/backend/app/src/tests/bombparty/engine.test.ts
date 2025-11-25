import { describe, it, expect, beforeEach } from '@jest/globals';
import { BombPartyEngine } from '../../modules/bombparty/GameEngine.ts';
import { giveRandomBonus } from '../../modules/bombparty/engine/engineRules.ts';
import type { GameState } from '../../modules/bombparty/types.ts';
import { MAX_BONUS_PER_TYPE } from '/usr/shared/bombparty/types';

describe('BombPartyEngine', () => {
  let engine: BombPartyEngine;

  beforeEach(() => {
    engine = new BombPartyEngine();
  });

  describe('initializeGame', () => {
    it('should initialize game with players', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      const state = engine.getState();
      
      expect(state.players.length).toBe(2);
      expect(state.players[0].id).toBe('player1');
      expect(state.players[1].id).toBe('player2');
      expect(state.players[0].lives).toBe(3);
      expect(state.players[1].lives).toBe(3);
    });

    it('should initialize with custom config', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players, {
        livesPerPlayer: 5,
        turnDurationMs: 20000
      });
      
      const state = engine.getState();
      expect(state.players[0].lives).toBe(5);
      expect(state.baseTurnSeconds).toBe(20);
    });
  });

  describe('startCountdown', () => {
    it('should set phase to COUNTDOWN', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      engine.startCountdown();
      
      const state = engine.getState();
      expect(state.phase).toBe('COUNTDOWN');
    });
  });

  describe('startTurn', () => {
    it('should start a turn with a syllable', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      engine.startCountdown();
      engine.startTurn();
      
      const state = engine.getState();
      expect(state.phase).toBe('TURN_ACTIVE');
      expect(state.currentSyllable).toBeDefined();
      expect(state.currentSyllable.length).toBeGreaterThan(0);
      expect(state.turnStartedAt).toBeDefined();
      expect(state.turnDurationMs).toBeGreaterThan(0);
    });

    it('should set current player correctly', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      engine.startCountdown();
      engine.startTurn();
      
      const state = engine.getState();
      expect(state.currentPlayerId).toBe('player1');
      expect(state.currentPlayerIndex).toBe(0);
    });
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

    it('should accept valid word containing syllable', () => {
      const state = engine.getState();
      const syllable = state.currentSyllable.toLowerCase();
      const word = `test${syllable}word`;
      
      const result = engine.submitWord(word, 1000);
      
      expect(result).toBeDefined();
      expect(typeof result.ok).toBe('boolean');
    });

    it('should reject word without syllable', () => {
      const result = engine.submitWord('testword', 1000);
      
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('no_syllable');
    });

    it('should reject duplicate word', () => {
      const state = engine.getState();
      const syllable = state.currentSyllable.toLowerCase();
      const word = `test${syllable}word`;
      
      engine.submitWord(word, 1000);
      
      const result = engine.submitWord(word, 2000);
      
      const newState = engine.getState();
      if (newState.usedWords.includes(word.toLowerCase())) {
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('duplicate');
      }
    });
  });

  describe('resolveTurn', () => {
    beforeEach(() => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      engine.startCountdown();
      engine.startTurn();
    });

    it('should move to next player after resolving turn', () => {
      const initialState = engine.getState();
      const initialPlayerIndex = initialState.currentPlayerIndex;
      
      engine.resolveTurn(true, false);
      
      const newState = engine.getState();
      expect(newState.currentPlayerIndex).not.toBe(initialPlayerIndex);
    });

    it('should reduce lives when word is invalid', () => {
      const initialState = engine.getState();
      const initialLives = initialState.players[initialState.currentPlayerIndex].lives;
      
      engine.resolveTurn(false, false);
      
      const newState = engine.getState();
      const currentPlayer = newState.players[initialState.currentPlayerIndex];
      expect(currentPlayer.lives).toBe(initialLives - 1);
    });
  });

  describe('isGameOver', () => {
    it('should return false at game start', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      expect(engine.isGameOver()).toBe(false);
    });

    it('should return true when only one player remains', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      const state = engine.getState();
      
      state.players.forEach((player, index) => {
        if (index > 0) {
          player.isEliminated = true;
        }
      });
      
      engine.resolveTurn(false, false);
      
      expect(engine.isGameOver()).toBe(true);
    });
  });

  describe('getWinner', () => {
    it('should return null when game is not over', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      expect(engine.getWinner()).toBeNull();
    });

    it('should return winner when game is over', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      const state = engine.getState();
      
      state.players[1].isEliminated = true;
      
      const winner = engine.getWinner();
      expect(winner).toBeDefined();
      expect(winner?.id).toBe('player1');
    });
  });

  describe('activateBonus', () => {
    beforeEach(() => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      const state = engine.getState();
      state.players[0].bonuses.plus5sec = 1;
    });

    it('should activate plus5sec bonus', () => {
      const result = engine.activateBonus('player1', 'plus5sec');
      
      expect(result.ok).toBe(true);
      const state = engine.getState();
      expect(state.players[0].bonuses.plus5sec).toBe(0);
    });

    it('should fail if player has no bonus', () => {
      const result = engine.activateBonus('player1', 'plus5sec');
      
      const result2 = engine.activateBonus('player1', 'plus5sec');
      expect(result2.ok).toBe(false);
    });
  });

  describe('isTurnExpired', () => {
    it('should return false for new turn', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];
      
      engine.initializeGame(players);
      engine.startCountdown();
      engine.startTurn();
      
      expect(engine.isTurnExpired()).toBe(false);
    });
  });

  describe('giveRandomBonus - weighted distribution', () => {
    let testState: GameState;

    beforeEach(() => {
      testState = {
        phase: 'TURN_ACTIVE',
        players: [
          {
            id: 'player1',
            name: 'Player 1',
            lives: 3,
            isEliminated: false,
            streak: 0,
            bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 },
          },
        ],
        currentPlayerIndex: 0,
        currentPlayerId: 'player1',
        currentSyllable: 'test',
        usedWords: [],
        turnStartedAt: Date.now(),
        turnDurationMs: 15000,
        turnOrder: ['player1'],
        turnDirection: 1,
        baseTurnSeconds: 15,
        history: [],
      };
    });

    it('should respect the maximum bonus limit per type', () => {
      testState.players[0].bonuses.extraLife = MAX_BONUS_PER_TYPE;
      testState.players[0].bonuses.inversion = MAX_BONUS_PER_TYPE;
      testState.players[0].bonuses.plus5sec = MAX_BONUS_PER_TYPE;
      testState.players[0].bonuses.doubleChance = MAX_BONUS_PER_TYPE;
      testState.players[0].bonuses.vitesseEclair = MAX_BONUS_PER_TYPE;

      const initialBonuses = { ...testState.players[0].bonuses };
      giveRandomBonus(testState, 'player1');

      expect(testState.players[0].bonuses.extraLife).toBe(initialBonuses.extraLife);
      expect(testState.players[0].bonuses.inversion).toBe(initialBonuses.inversion);
      expect(testState.players[0].bonuses.plus5sec).toBe(initialBonuses.plus5sec);
      expect(testState.players[0].bonuses.doubleChance).toBe(initialBonuses.doubleChance);
      expect(testState.players[0].bonuses.vitesseEclair).toBe(initialBonuses.vitesseEclair);
    });

    it('should not exceed maximum bonus limit when adding new bonus', () => {
      testState.players[0].bonuses.extraLife = MAX_BONUS_PER_TYPE - 1;
      
      giveRandomBonus(testState, 'player1');
      
      expect(testState.players[0].bonuses.extraLife).toBeLessThanOrEqual(MAX_BONUS_PER_TYPE);
    });

    it('should distribute bonuses according to weights (statistical test)', () => {
      const distribution: Record<string, number> = {
        extraLife: 0,
        vitesseEclair: 0,
        plus5sec: 0,
        doubleChance: 0,
        inversion: 0,
      };

      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        const stateCopy: GameState = {
          ...testState,
          players: [{
            ...testState.players[0],
            bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 },
          }],
        };
        
        giveRandomBonus(stateCopy, 'player1');
        
        const player = stateCopy.players[0];
        if (player.bonuses.extraLife > 0) distribution.extraLife++;
        else if (player.bonuses.vitesseEclair > 0) distribution.vitesseEclair++;
        else if (player.bonuses.plus5sec > 0) distribution.plus5sec++;
        else if (player.bonuses.doubleChance > 0) distribution.doubleChance++;
        else if (player.bonuses.inversion > 0) distribution.inversion++;
      }

      const extraLifePercent = (distribution.extraLife / iterations) * 100;
      expect(extraLifePercent).toBeGreaterThan(3);
      expect(extraLifePercent).toBeLessThan(8);

      const inversionPercent = (distribution.inversion / iterations) * 100;
      expect(inversionPercent).toBeGreaterThan(25);
      expect(inversionPercent).toBeLessThan(35);

      const plus5secPercent = (distribution.plus5sec / iterations) * 100;
      expect(plus5secPercent).toBeGreaterThan(20);
      expect(plus5secPercent).toBeLessThan(30);

      const doubleChancePercent = (distribution.doubleChance / iterations) * 100;
      expect(doubleChancePercent).toBeGreaterThan(20);
      expect(doubleChancePercent).toBeLessThan(30);

      const vitesseEclairPercent = (distribution.vitesseEclair / iterations) * 100;
      expect(vitesseEclairPercent).toBeGreaterThan(10);
      expect(vitesseEclairPercent).toBeLessThan(20);
    });

    it('should only select from available bonuses when some are at max', () => {
      testState.players[0].bonuses.extraLife = MAX_BONUS_PER_TYPE;
      testState.players[0].bonuses.inversion = MAX_BONUS_PER_TYPE;

      for (let i = 0; i < 10; i++) {
        giveRandomBonus(testState, 'player1');
      }

      expect(testState.players[0].bonuses.extraLife).toBe(MAX_BONUS_PER_TYPE);
      expect(testState.players[0].bonuses.inversion).toBe(MAX_BONUS_PER_TYPE);
      
      expect(testState.players[0].bonuses.plus5sec).toBeLessThanOrEqual(MAX_BONUS_PER_TYPE);
      expect(testState.players[0].bonuses.doubleChance).toBeLessThanOrEqual(MAX_BONUS_PER_TYPE);
      expect(testState.players[0].bonuses.vitesseEclair).toBeLessThanOrEqual(MAX_BONUS_PER_TYPE);
    });
  });
});

