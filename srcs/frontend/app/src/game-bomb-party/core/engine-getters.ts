import type { GameState, Player } from './types';
import trigramWordsData from '../data/trigram_words.json';

/**
 * Classe contenant tous les getters du BombPartyEngine
 * Séparés pour une meilleure organisation du code
 */
export class BombPartyEngineGetters {
  private state: GameState;
  private currentTrigramUsageCount: number;
  private totalPlayersInRound: number;

  constructor(
    state: GameState,
    currentTrigramUsageCount: number,
    totalPlayersInRound: number
  ) {
    this.state = state;
    this.currentTrigramUsageCount = currentTrigramUsageCount;
    this.totalPlayersInRound = totalPlayersInRound;
  }

  getState(): GameState {
    return { ...this.state };
  }

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

  getWordSuggestions(maxSuggestions: number = 5): string[] {
    if (!this.state.currentTrigram) return [];
    const map = trigramWordsData as unknown as Record<string, string[]>;
    const list = map[this.state.currentTrigram] || [];
    return list
      .filter((w: string) => !this.state.usedWords.includes((w || '').toLowerCase()))
      .slice(0, maxSuggestions);
  }

  getCurrentTrigramInfo(): { trigram: string; availableWords: number; totalWords: number } {
    if (!this.state.currentTrigram) {
      return { trigram: '', availableWords: 0, totalWords: 0 };
    }
    const map = trigramWordsData as unknown as Record<string, string[]>;
    const list = map[this.state.currentTrigram] || [];
    const availableWords = list.filter((w: string) => !this.state.usedWords.includes((w || '').toLowerCase())).length;
    return { trigram: this.state.currentTrigram, availableWords, totalWords: list.length };
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
