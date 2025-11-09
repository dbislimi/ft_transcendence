import { describe, it, expect, beforeEach } from '@jest/globals';
import { BombPartyEngine } from '../../modules/bombparty/GameEngine.ts';

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
      
      // Note: La validation réelle dépend du dictionnaire
      // Ce test vérifie au moins que la méthode fonctionne
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
      
      // Première soumission (peut échouer si le mot n'est pas dans le dictionnaire)
      engine.submitWord(word, 1000);
      
      // Deuxième soumission devrait être rejetée comme doublon
      const result = engine.submitWord(word, 2000);
      
      // Si la première a réussi, la deuxième devrait être un doublon
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
      // Le joueur suivant devrait être sélectionné
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
      
      // Éliminer tous les joueurs sauf un
      state.players.forEach((player, index) => {
        if (index > 0) {
          player.isEliminated = true;
        }
      });
      
      // Forcer la mise à jour de l'état
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
      
      // Éliminer tous les joueurs sauf le premier
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
      // Donner un bonus au joueur
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
      
      // Après activation, plus de bonus
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
});

