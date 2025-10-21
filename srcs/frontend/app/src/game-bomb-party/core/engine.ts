import type { GameState, GamePhase, Player, GameConfig, BonusKey } from './types';
import { STREAK_FOR_BONUS } from './types';
import { validateWithDictionary, validateLocal } from '../data/validator';
import trigramWordsData from '../data/trigram_words.json';

export class BombPartyEngine {
  private state: GameState;
  private lastTrigram: string = '';
  private currentTrigramUsageCount: number = 0; // Nombre de fois que le trigramme actuel a été utilisé
  private totalPlayersInRound: number = 0; // Nombre total de joueurs dans le tour complet
  private doubleChanceConsumedThisTurn: boolean = false;

  constructor() {
    this.state = this.getInitialState();
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

    // Initialiser
    this.currentTrigramUsageCount = 0;
    this.totalPlayersInRound = config.playersCount;
    console.log('🎯 Nouveau système de trigrammes: nouveau trigramme à chaque tour');
  }

  startCountdown(): void {
    this.state.phase = 'COUNTDOWN';
  }

  startTurn(): void {
    // Vérifier que le joueur actuel est vivant
    if (this.state.players[this.state.currentPlayerIndex]?.isEliminated) {
      console.log('⚠️ Joueur actuel éliminé, passage au suivant');
      this.nextPlayer();
      if (this.state.players[this.state.currentPlayerIndex]?.isEliminated) {
        // Tous les joueurs sont éliminés
        this.state.phase = 'GAME_OVER';
        return;
      }
    }

    // Nouveau: un nouveau trigramme à chaque tour
    this.state.currentTrigram = this.getNewTrigram();
    this.currentTrigramUsageCount = 1;
    this.totalPlayersInRound = this.state.players.length;
    this.state.phase = 'TURN_ACTIVE';

    // Reset turn-scoped flags
    this.doubleChanceConsumedThisTurn = false;

    const duration = this.getTurnDurationForCurrentPlayer();
    const now = performance.now();
    this.state.turnEndsAt = now + duration;
    this.state.activeTurnEndsAt = this.state.turnEndsAt;
    // If fast turn applied to this player, clear the flag now
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

  // Sélectionne un trigramme depuis la ressource JSON (mapping trigram -> mots[])
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
      console.log('✅ Mot valide accepté:', word);
      this.state.usedWords.push(word.toLowerCase());
      this.state.history.push({
        playerId: this.state.players[this.state.currentPlayerIndex].id,
        word,
        ok: true,
        msTaken
      });

      // Streak & bonus gain
      const p = this.state.players[this.state.currentPlayerIndex];
      p.streak = (p.streak || 0) + 1;
      if (p.streak > 0 && p.streak % STREAK_FOR_BONUS === 0) {
        this.giveRandomBonus(p.id);
      }

      // Clear doubleChance if any pending (it should apply next turn only)
      // no-op here

      this.state.phase = 'RESOLVE';
      return { ok: true };
    } else {
      console.log('❌ Mot invalide rejeté:', word, 'Raison:', validation.reason);
      this.state.history.push({
        playerId: this.state.players[this.state.currentPlayerIndex].id,
        word,
        ok: false,
        msTaken
      });
      // Check double chance
      const p = this.state.players[this.state.currentPlayerIndex];
      if (p?.pendingEffects?.doubleChance && !this.doubleChanceConsumedThisTurn) {
        this.doubleChanceConsumedThisTurn = true;
        // consume the flag but keep the turn active (no resolve here)
        if (p.pendingEffects) p.pendingEffects.doubleChance = false;
        return { ok: false, reason: validation.reason, consumedDoubleChance: true };
      }

      this.state.phase = 'RESOLVE';
      return { ok: false, reason: validation.reason };
    }
  }

  resolveTurn(wordValid: boolean, timeExpired: boolean): void {
    console.log('🔄 Résolution du tour - Mot valide:', wordValid, 'Temps expiré:', timeExpired);

    // Vérification de sécurité
    if (this.state.players.length === 0 || this.state.currentPlayerIndex >= this.state.players.length) {
      console.error('❌ Erreur: Aucun joueur ou index invalide');
      return;
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer) {
      console.error('❌ Erreur: Joueur actuel non trouvé');
      return;
    }

    console.log('👤 Joueur actuel:', currentPlayer.name, 'Vies restantes:', currentPlayer.lives);

    if (!wordValid || timeExpired) {
      // Reset streak on failure
      currentPlayer.streak = 0;

      currentPlayer.lives = Math.max(0, currentPlayer.lives - 1);
      if (currentPlayer.lives === 0) {
        console.log('💀 Joueur éliminé:', currentPlayer.name);
        currentPlayer.isEliminated = true;
      }
    }

    // Vérifier s'il reste un seul joueur vivant
    const alivePlayers = this.state.players.filter(p => !p.isEliminated);
    if (alivePlayers.length <= 1) {
      this.state.phase = 'GAME_OVER';
      return;
    }

    // Incrémenter (non significatif désormais, conservé pour compat UI)
    this.currentTrigramUsageCount++;

    // Passer au joueur suivant
    this.nextPlayer();

    // Démarrer le prochain tour (un nouveau trigramme sera tiré)
    this.startTurn();
  }

  private nextPlayer(): void {
    if (this.state.players.length === 0) return;
    let attempts = 0;
    const maxAttempts = this.state.players.length * 2;
    do {
      // advance index according to direction
      const step = this.state.turnDirection === 1 ? 1 : -1;
      const len = this.state.players.length;
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + step + len) % len;
      attempts++;
      if (attempts > maxAttempts) {
        console.error('❌ Erreur: Impossible de trouver le prochain joueur');
        break;
      }
    } while (this.state.players[this.state.currentPlayerIndex]?.isEliminated);

    if (!this.state.players[this.state.currentPlayerIndex]) {
      console.error('❌ Erreur: Aucun joueur valide trouvé');
      this.state.phase = 'GAME_OVER';
    }
  }

  getState(): GameState {
    return { ...this.state };
  }

  // Nouvelles méthodes pour le système de trigrammes
  getCurrentTrigramUsageCount(): number {
    return this.currentTrigramUsageCount;
  }

  getTotalPlayersInRound(): number {
    return this.totalPlayersInRound;
  }

  getCurrentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex];
  }

  getAlivePlayersCount(): number {
    return this.state.players.filter(p => !p.isEliminated).length;
  }

  isGameOver(): boolean {
    return this.state.phase === 'GAME_OVER';
  }

  getWinner(): Player | null {
    if (this.state.phase !== 'GAME_OVER') return null;
    const alivePlayers = this.state.players.filter(p => !p.isEliminated);
    return alivePlayers.length === 1 ? alivePlayers[0] : null;
  }

  reset(): void {
    this.state = this.getInitialState();
    this.lastTrigram = '';
  }

  // Suggestions basées sur le mapping trigram -> mots[] de trigram_words.json
  getWordSuggestions(maxSuggestions: number = 5): string[] {
    if (!this.state.currentTrigram) return [];
    const map = trigramWordsData as unknown as Record<string, string[]>;
    const list = map[this.state.currentTrigram] || [];
    return list
      .filter((w: string) => !this.state.usedWords.includes((w || '').toLowerCase()))
      .slice(0, maxSuggestions);
  }

  // Informations sur le trigramme actuel (totaux basés sur le mapping)
  getCurrentTrigramInfo(): { trigram: string; availableWords: number; totalWords: number } {
    if (!this.state.currentTrigram) {
      return { trigram: '', availableWords: 0, totalWords: 0 };
    }
    const map = trigramWordsData as unknown as Record<string, string[]>;
    const list = map[this.state.currentTrigram] || [];
    const availableWords = list.filter((w: string) => !this.state.usedWords.includes((w || '').toLowerCase())).length;
    return { trigram: this.state.currentTrigram, availableWords, totalWords: list.length };
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

  getTurnDurationForCurrentPlayer(): number {
    const base = this.state.baseTurnSeconds * 1000;
    const currentId = this.state.players[this.state.currentPlayerIndex]?.id;
    if (currentId && this.state.pendingFastForNextPlayerId === currentId) {
      return 3000;
    }
    return base;
  }
}
