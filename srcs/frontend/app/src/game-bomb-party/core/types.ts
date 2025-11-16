import type { GamePhase, BonusKey, PlayerBonuses, Player, GameState as SharedGameState, GameConfig, ValidationResult } from '@shared/bombparty/types';

export type { GamePhase, BonusKey, PlayerBonuses, Player, GameConfig, ValidationResult };

export type PlayerState = Player;

export interface GameState extends SharedGameState {
  winner?: Player;
  finalStats?: any;
  stateVersion?: number;
  sequenceNumber?: number;
}

export interface SyllableInfo {
  syllable: string;
  availableWords: number;
  totalWords: number;
}

export interface WordSuggestion {
  word: string;
  isUsed: boolean;
}

export { STREAK_FOR_BONUS } from '@shared/bombparty/types';
