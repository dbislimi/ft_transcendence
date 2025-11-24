import type { GameState, GamePhase, Player, GameConfig, BonusKey, PlayerBonuses } from './types';
import { STREAK_FOR_BONUS } from './types';
import { validateWithDictionary, validateLocal } from '../data/validator';
import { BombPartyEngineGetters } from './engine-getters';
import { getRandomSyllable } from '../data/syllableLoader';
import { BONUS_WEIGHTS, MAX_BONUS_PER_TYPE } from '@shared/bombparty/types';

export class BombPartyEngine {
  private state: GameState;
  private lastSyllable: string = '';
  private currentSyllableUsageCount: number = 0;
  private totalPlayersInRound: number = 0;
  private doubleChanceConsumedThisTurn: boolean = false;
  private getters!: BombPartyEngineGetters;

  constructor() {
    this.state = this.getInitialState();
    this.updateGetters();
  }

  private updateGetters(): void {
    this.getters = new BombPartyEngineGetters(
      this.state,
      this.currentSyllableUsageCount,
      this.totalPlayersInRound
    );
  }

  private getInitialState(): GameState {
    return {
      phase: 'LOBBY',
      players: [],
      currentPlayerIndex: 0,
      currentPlayerId: '',
      currentSyllable: '',
      usedWords: [],
      turnStartedAt: 0,
      turnDurationMs: 15000,
      turnEndsAt: 0,
      turnOrder: [],
      turnDirection: 1,
      baseTurnSeconds: 15,
      activeTurnEndsAt: undefined,
      history: []
    };
  }

  startGame(config: GameConfig, player1Name?: string): void {
    const players: Player[] = [];
    for (let i = 0; i < config.playersCount; i++) {
      const defaultName = i === 0 && player1Name ? player1Name : `Joueur ${i + 1}`;
      players.push({
        id: `player-${i + 1}`,
        name: defaultName,
        lives: config.livesPerPlayer,
        isEliminated: false,
        streak: 0,
        bonuses: { inversion: 0, plus5sec: 0, vitesseEclair: 0, doubleChance: 0, extraLife: 0 },
        pendingEffects: {}
      });
    }

    this.state = {
      phase: 'COUNTDOWN',
      players,
      currentPlayerIndex: 0,
      currentPlayerId: players[0]?.id || '',
      currentSyllable: '',
      usedWords: [],
      turnStartedAt: 0,
      turnDurationMs: config.turnDurationMs,
      turnEndsAt: 0,
      turnOrder: players.map(p => p.id),
      turnDirection: 1,
      baseTurnSeconds: Math.max(3, Math.floor(config.turnDurationMs / 1000)),
      activeTurnEndsAt: undefined,
      history: []
    };

    // Init
    this.currentSyllableUsageCount = 0;
    this.totalPlayersInRound = config.playersCount;
  }

  startCountdown(): void {
    this.state.phase = 'COUNTDOWN';
  }

  startTurn(): void {
    if (this.state.players[this.state.currentPlayerIndex]?.isEliminated) {
      this.nextPlayer();
      if (this.state.players[this.state.currentPlayerIndex]?.isEliminated) {
        this.state.phase = 'GAME_OVER';
        return;
      }
    }

    this.state.currentSyllable = this.getNewSyllable();
    this.currentSyllableUsageCount = 1;
    this.totalPlayersInRound = this.state.players.length;
    this.state.phase = 'TURN_ACTIVE';
    this.doubleChanceConsumedThisTurn = false;

    const duration = this.getTurnDurationForCurrentPlayer();
    const now = Date.now();
    this.state.turnStartedAt = now;
    this.state.turnDurationMs = duration;
    this.state.turnEndsAt = now + duration;
    this.state.activeTurnEndsAt = this.state.turnEndsAt;
    const curId = this.state.players[this.state.currentPlayerIndex]?.id;
    if (curId && this.state.pendingFastForNextPlayerId === curId) {
      this.state.pendingFastForNextPlayerId = undefined;
    }
  }

  private getNewSyllable(): string {
    const newSyllable = getRandomSyllable(this.lastSyllable);
    this.lastSyllable = newSyllable;
    return newSyllable;
  }

  submitWord(word: string, msTaken: number): { ok: boolean; reason?: string; consumedDoubleChance?: boolean } {
    const validation = validateWithDictionary(word, this.state.currentSyllable, this.state.usedWords);
    if (validation.ok) {
      this.state.usedWords.push(word.toLowerCase());
      this.state.history.push({
        playerId: this.state.players[this.state.currentPlayerIndex].id,
        word,
        ok: true,
        msTaken
      });
      const p = this.state.players[this.state.currentPlayerIndex];
      p.streak = (p.streak || 0) + 1;
      if (p.streak > 0 && p.streak % STREAK_FOR_BONUS === 0) {
        this.giveRandomBonus(p.id);
      }
      this.state.phase = 'RESOLVE';
      return { ok: true };
    } else {
      this.state.history.push({
        playerId: this.state.players[this.state.currentPlayerIndex].id,
        word,
        ok: false,
        msTaken
      });
      const p = this.state.players[this.state.currentPlayerIndex];
      if (p?.pendingEffects?.doubleChance && !this.doubleChanceConsumedThisTurn) {
        this.doubleChanceConsumedThisTurn = true;
        if (p.pendingEffects) p.pendingEffects.doubleChance = false;
        return { ok: false, reason: validation.reason, consumedDoubleChance: true };
      }
      this.state.phase = 'RESOLVE';
      return { ok: false, reason: validation.reason };
    }
  }

  resolveTurn(wordValid: boolean, timeExpired: boolean): void {
    if (this.state.players.length === 0 || this.state.currentPlayerIndex >= this.state.players.length) {
      console.error('Erreur: Aucun joueur ou index invalide');
      return;
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer) {
      console.error('Erreur: Joueur actuel non trouvé');
      return;
    }

    const livesBefore = currentPlayer.lives;
    console.log('Joueur actuel:', currentPlayer.name, 'Vies restantes:', currentPlayer.lives, 'wordValid:', wordValid, 'timeExpired:', timeExpired);
    if (!wordValid || timeExpired) {
      currentPlayer.streak = 0;
      currentPlayer.lives = Math.max(0, currentPlayer.lives - 1);
      console.log('[BombPartyEngine] Perte de vie:', {
        playerName: currentPlayer.name,
        livesBefore,
        livesAfter: currentPlayer.lives,
        reason: timeExpired ? 'Timer expiré' : 'Mot invalide'
      });
      if (currentPlayer.lives === 0) {
        currentPlayer.isEliminated = true;
        console.log('[BombPartyEngine] Joueur éliminé:', currentPlayer.name);
      }
    }

    const alivePlayers = this.state.players.filter(p => !p.isEliminated);
    if (alivePlayers.length <= 1) {
      this.state.phase = 'GAME_OVER';
      return;
    }
    this.currentSyllableUsageCount++;
    this.nextPlayer();
    this.startTurn();
  }

  private nextPlayer(): void {
    if (this.state.players.length === 0) return;
    let attempts = 0;
    const maxAttempts = this.state.players.length * 2;
    do {
      const step = this.state.turnDirection === 1 ? 1 : -1;
      const len = this.state.players.length;
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + step + len) % len;
      attempts++;
      if (attempts > maxAttempts) {
        console.error('Erreur: Impossible de trouver le prochain joueur');
        break;
      }
    } while (this.state.players[this.state.currentPlayerIndex]?.isEliminated);
    if (!this.state.players[this.state.currentPlayerIndex]) {
      console.error('Erreur: Aucun joueur valide trouvé');
      this.state.phase = 'GAME_OVER';
    }
  }

  getState(): GameState {
    this.updateGetters();
    return this.getters.getState();
  }

  getCurrentSyllableUsageCount(): number {
    this.updateGetters();
    return this.getters.getCurrentSyllableUsageCount();
  }

  getTotalPlayersInRound(): number {
    this.updateGetters();
    return this.getters.getTotalPlayersInRound();
  }

  getCurrentPlayer(): Player {
    this.updateGetters();
    return this.getters.getCurrentPlayer();
  }

  getAlivePlayersCount(): number {
    this.updateGetters();
    return this.getters.getAlivePlayersCount();
  }

  isGameOver(): boolean {
    this.updateGetters();
    return this.getters.isGameOver();
  }

  getWinner(): Player | null {
    this.updateGetters();
    return this.getters.getWinner();
  }

  getWordSuggestions(maxSuggestions: number = 5): string[] {
    this.updateGetters();
    return this.getters.getWordSuggestions(maxSuggestions);
  }

  getCurrentSyllableInfo(): { syllable: string; availableWords: number; totalWords: number } {
    this.updateGetters();
    return this.getters.getCurrentSyllableInfo();
  }

  getTurnDurationForCurrentPlayer(): number {
    this.updateGetters();
    return this.getters.getTurnDurationForCurrentPlayer();
  }

  reset(): void {
    this.state = this.getInitialState();
    this.lastSyllable = '';
    this.updateGetters();
  }

  private selectWeightedBonus(playerBonuses: PlayerBonuses): BonusKey | null {
    const availableBonuses = BONUS_WEIGHTS.filter(([key]) => {
      const currentCount = playerBonuses[key] || 0;
      return currentCount < MAX_BONUS_PER_TYPE;
    });

    if (availableBonuses.length === 0) {
      return null;
    }

    const totalWeight = availableBonuses.reduce((sum, [, weight]) => sum + weight, 0);
    
    let random = Math.random() * totalWeight;
    
    for (const [key, weight] of availableBonuses) {
      random -= weight;
      if (random <= 0) {
        return key;
      }
    }
    
    return availableBonuses[0][0];
  }

  private giveRandomBonus(playerId: string): void {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p) return;
    
    const selectedBonus = this.selectWeightedBonus(p.bonuses);
    
    if (selectedBonus) {
      const currentCount = p.bonuses[selectedBonus] || 0;
      if (currentCount < MAX_BONUS_PER_TYPE) {
        p.bonuses[selectedBonus] = currentCount + 1;
      }
    }
  }

  activateBonus(playerId: string, bonusKey: BonusKey): { ok: boolean; meta?: any } {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p) return { ok: false };
    if (!p.bonuses[bonusKey] || p.bonuses[bonusKey] <= 0) return { ok: false };

    switch (bonusKey) {
      case 'inversion':
        this.state.turnDirection = this.state.turnDirection === 1 ? -1 : 1;
        p.bonuses.inversion -= 1;
        return { ok: true };
      case 'plus5sec':
        if (this.state.phase === 'TURN_ACTIVE' && this.state.activeTurnEndsAt) {
          this.state.activeTurnEndsAt += 5000;
          this.state.turnEndsAt = this.state.activeTurnEndsAt;
          p.bonuses.plus5sec -= 1;
          return { ok: true, meta: { extendMs: 5000 } };
        }
        return { ok: false };
      case 'vitesseEclair':
        const targetIdx = this.peekNextAliveIndex();
        const targetId = targetIdx >= 0 ? this.state.players[targetIdx].id : undefined;
        if (targetId) {
          this.state.pendingFastForNextPlayerId = targetId;
          p.bonuses.vitesseEclair -= 1;
          return { ok: true, meta: { targetId } };
        }
        return { ok: false };
      case 'doubleChance':
        p.pendingEffects = p.pendingEffects || {};
        p.pendingEffects.doubleChance = true;
        p.bonuses.doubleChance -= 1;
        return { ok: true };
      case 'extraLife':
        if (p.isEliminated) return { ok: false };
        p.lives = Math.min(p.lives + 1, 9);
        p.bonuses.extraLife -= 1;
        return { ok: true };
      default:
        return { ok: false };
    }
  }

  private peekNextAliveIndex(): number {
    if (this.state.players.length === 0) return -1;
    let idx = this.state.currentPlayerIndex;
    const len = this.state.players.length;
    for (let i = 0; i < len; i++) {
      const step = this.state.turnDirection === 1 ? 1 : -1;
      idx = (idx + step + len) % len;
      if (!this.state.players[idx].isEliminated) return idx;
    }
    return -1;
  }
}
