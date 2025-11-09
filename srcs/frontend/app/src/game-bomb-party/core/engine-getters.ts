import type { GameState, Player } from './types';

// classe contenant tous les getters du BombPartyEngine
// separes pour une meilleure organisation du code
export class BombPartyEngineGetters {
  private state: GameState;
  private currentSyllableUsageCount: number;
  private totalPlayersInRound: number;

  constructor(
    state: GameState,
    currentSyllableUsageCount: number,
    totalPlayersInRound: number
  ) {
    this.state = state;
    this.currentSyllableUsageCount = currentSyllableUsageCount;
    this.totalPlayersInRound = totalPlayersInRound;
  }

  getState(): GameState {
    return { ...this.state };
  }

  getCurrentSyllableUsageCount(): number {
    return this.currentSyllableUsageCount;
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
    // pour le mode local, retourne des suggestions basiques
    // en mode multiplayer, les suggestions viennent du backend
    if (!this.state.currentSyllable) return [];
    // suggestions simplifiees pour le mode local
    return [];
  }

  getCurrentSyllableInfo(): { syllable: string; availableWords: number; totalWords: number } {
    if (!this.state.currentSyllable) {
      return { syllable: '', availableWords: 0, totalWords: 0 };
    }
    // pour le mode local, retourne des valeurs par defaut
    // en mode multiplayer, les infos viennent du backend
    return { syllable: this.state.currentSyllable, availableWords: 0, totalWords: 0 };
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
