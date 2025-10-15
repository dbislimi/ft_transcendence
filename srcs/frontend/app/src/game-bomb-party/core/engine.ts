import type { GameState, GamePhase, Player, GameConfig, BonusKey } from './types';
import { STREAK_FOR_BONUS } from './types';
import { validateWithDictionary, validateLocal } from '../data/validator';
import trigramWordsData from '../data/trigram_words.json';
import { BombPartyEngineGetters } from './engine-getters';

export class BombPartyEngine {
  private state: GameState;
  private lastTrigram: string = '';
  private currentTrigramUsageCount: number = 0;
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
      this.currentTrigramUsageCount,
      this.totalPlayersInRound
    );
  }

  private getInitialState(): GameState {
    return {
      phase: 'LOBBY',
      players: [],
      currentPlayerIndex: 0,
      currentTrigram: '',
      usedWords: [],
      turnEndsAt: 0,
      turnOrder: [],
      turnDirection: 1,
      baseTurnSeconds: 15,
      activeTurnEndsAt: undefined,
      history: []
    };
  }

  startGame(config: GameConfig): void {
    const players: Player[] = [];
    for (let i = 0; i < config.playersCount; i++) {
      players.push({
        id: `player-${i + 1}`,
        name: `Joueur ${i + 1}`,
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
      currentTrigram: '',
      usedWords: [],
      turnEndsAt: 0,
      turnOrder: players.map(p => p.id),
      turnDirection: 1,
      baseTurnSeconds: Math.max(3, Math.floor(config.turnDurationMs / 1000)),
      activeTurnEndsAt: undefined,
      history: []
    };

    // Init
    this.currentTrigramUsageCount = 0;
    this.totalPlayersInRound = config.playersCount;
    console.log('Nouveau système de trigrammes: nouveau trigramme à chaque tour');
  }

  startCountdown(): void {
    this.state.phase = 'COUNTDOWN';
  }

  startTurn(): void {
    if (this.state.players[this.state.currentPlayerIndex]?.isEliminated) {
      console.log('Joueur actuel éliminé, passage au suivant');
      this.nextPlayer();
      if (this.state.players[this.state.currentPlayerIndex]?.isEliminated) {
        this.state.phase = 'GAME_OVER';
        return;
      }
    }

    this.state.currentTrigram = this.getNewTrigram();
    this.currentTrigramUsageCount = 1;
    this.totalPlayersInRound = this.state.players.length;
    this.state.phase = 'TURN_ACTIVE';
    this.doubleChanceConsumedThisTurn = false;

    const duration = this.getTurnDurationForCurrentPlayer();
    const now = performance.now();
    this.state.turnEndsAt = now + duration;
    this.state.activeTurnEndsAt = this.state.turnEndsAt;
    const curId = this.state.players[this.state.currentPlayerIndex]?.id;
    if (curId && this.state.pendingFastForNextPlayerId === curId) {
      this.state.pendingFastForNextPlayerId = undefined;
    }
    console.log('🔄 Tour démarré pour:', this.state.players[this.state.currentPlayerIndex]?.name, 'Trigramme:', this.state.currentTrigram);
  }

  private getNewTrigram(): string {
    const newTrigram = this.selectRandomTrigram();
    this.lastTrigram = newTrigram;
    return newTrigram;
  }

  private selectRandomTrigram(): string {
    const map = trigramWordsData as unknown as Record<string, string[]>;
    const candidates = Object.keys(map);
    const filtered = candidates.filter(t => t !== this.lastTrigram);
    const pool = filtered.length > 0 ? filtered : candidates;
    if (pool.length === 0) return '';
    return pool[Math.floor(Math.random() * pool.length)];
  }

  submitWord(word: string, msTaken: number): { ok: boolean; reason?: string; consumedDoubleChance?: boolean } {
    console.log('🔍 Validation du mot:', word, 'pour le trigramme:', this.state.currentTrigram);
    const validation = validateWithDictionary(word, this.state.currentTrigram, this.state.usedWords);
    console.log('📋 Résultat de validation:', validation);
    if (validation.ok) {
      console.log('Mot valide accepté:', word);
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
      console.log('Mot invalide rejeté:', word, 'Raison:', validation.reason);
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
    console.log('🔄 Résolution du tour - Mot valide:', wordValid, 'Temps expiré:', timeExpired);
    if (this.state.players.length === 0 || this.state.currentPlayerIndex >= this.state.players.length) {
      console.error('Erreur: Aucun joueur ou index invalide');
      return;
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer) {
      console.error('Erreur: Joueur actuel non trouvé');
      return;
    }

    console.log('Joueur actuel:', currentPlayer.name, 'Vies restantes:', currentPlayer.lives);
    if (!wordValid || timeExpired) {
      currentPlayer.streak = 0;
      currentPlayer.lives = Math.max(0, currentPlayer.lives - 1);
      if (currentPlayer.lives === 0) {
        console.log('💀 Joueur éliminé:', currentPlayer.name);
        currentPlayer.isEliminated = true;
      }
    }

    const alivePlayers = this.state.players.filter(p => !p.isEliminated);
    if (alivePlayers.length <= 1) {
      this.state.phase = 'GAME_OVER';
      return;
    }
    this.currentTrigramUsageCount++;
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

  getCurrentTrigramUsageCount(): number {
    this.updateGetters();
    return this.getters.getCurrentTrigramUsageCount();
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

  getCurrentTrigramInfo(): { trigram: string; availableWords: number; totalWords: number } {
    this.updateGetters();
    return this.getters.getCurrentTrigramInfo();
  }

  getTurnDurationForCurrentPlayer(): number {
    this.updateGetters();
    return this.getters.getTurnDurationForCurrentPlayer();
  }

  reset(): void {
    this.state = this.getInitialState();
    this.lastTrigram = '';
    this.updateGetters();
  }

  // --- Bonuses mechanics ---
  private giveRandomBonus(playerId: string): void {
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p) return;
    const keys: BonusKey[] = ['inversion', 'plus5sec', 'vitesseEclair', 'doubleChance', 'extraLife'];
    const key = keys[Math.floor(Math.random() * keys.length)];
    p.bonuses[key] = (p.bonuses[key] || 0) + 1;
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
        // target next player alive
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
