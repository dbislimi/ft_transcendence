export type GamePhase = 'LOBBY' | 'COUNTDOWN' | 'TURN_ACTIVE' | 'RESOLVE' | 'GAME_OVER';

export interface Player {
  id: string;
  name: string;
  lives: number;
  isEliminated: boolean;
}

export interface GameConfig {
  livesPerPlayer: number;
  turnDurationMs: number;
  playersCount: 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  currentTrigram: string;
  usedWords: string[];
  turnEndsAt: number;
  history: Array<{
    playerId: string;
    word: string;
    ok: boolean;
    msTaken: number;
  }>;
}

export interface ValidationResult {
  ok: boolean;
  reason?: 'too_short' | 'no_trigram' | 'duplicate' | 'invalid_chars';
}

export interface TrigramInfo {
  trigram: string;
  availableWords: number;
  totalWords: number;
}

export interface WordSuggestion {
  word: string;
  isUsed: boolean;
}
