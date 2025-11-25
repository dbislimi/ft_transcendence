import type { GameState, Player } from './types';
import { bombPartyApiService } from '../../services/bombPartyApiService';

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
    return {
      ...this.state,
      players: this.state.players.map(p => ({
        ...p,
        bonuses: { ...p.bonuses },
        pendingEffects: { ...p.pendingEffects }
      }))
    };
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

  async getWordSuggestions(maxSuggestions: number = 5): Promise<string[]> {
    if (!this.state.currentSyllable) return [];
    return await bombPartyApiService.getWordSuggestions(this.state.currentSyllable, maxSuggestions);
  }


  async getCurrentSyllableInfo(): Promise<{ syllable: string; availableWords: number; totalWords: number }> {
    if (!this.state.currentSyllable) {
      return { syllable: '', availableWords: 0, totalWords: 0 };
    }
    try {
      const info = await bombPartyApiService.getSyllableInfo(this.state.currentSyllable);
      return {
        syllable: info.syllable,
        availableWords: info.availableWords,
        totalWords: info.totalWords
      };
    } catch (error) {
      console.error('[Engine] Error fetching syllable info:', error);
      return { syllable: this.state.currentSyllable, availableWords: 0, totalWords: 0 };
    }
  }


  getTurnDurationForCurrentPlayer(): number {
    const currentId = this.state.players[this.state.currentPlayerIndex]?.id;

    if (currentId && this.state.pendingFastForNextPlayerId === currentId) {
      return 3000;
    }

    const difficulty = this.state.currentSyllableDifficulty || 'medium';
    let baseDuration: number;

    switch (difficulty) {
      case 'easy':
        baseDuration = 12000;
        break;
      case 'hard':
        baseDuration = 19000;
        break;
      case 'medium':
      default:
        baseDuration = 15000;
        break;
    }

    return Math.min(baseDuration, 25000);
  }
}
