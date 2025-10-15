export type GamePhase = 'LOBBY' | 'COUNTDOWN' | 'TURN_ACTIVE' | 'RESOLVE' | 'GAME_OVER';

// --- Bonuses & Effects ---
export type BonusKey = 'inversion' | 'plus5sec' | 'vitesseEclair' | 'doubleChance' | 'extraLife';

export interface PlayerBonuses {
  inversion: number;
  plus5sec: number;
  vitesseEclair: number;
  doubleChance: number;
  extraLife: number;
}

export interface Player {
  id: string;
  name: string;
  lives: number;
  isEliminated: boolean;
  streak: number;
  bonuses: PlayerBonuses;
  pendingEffects?: {
    vitesseEclair?: boolean; // reserved - not used per-player currently
    doubleChance?: boolean;  // applies on player's next turn
  };
}

// Back-compat alias
export type PlayerState = Player;

export interface GameConfig {
  livesPerPlayer: number;
  turnDurationMs: number;
  playersCount: number;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  currentTrigram: string;
  usedWords: string[];
  turnEndsAt: number;
  // Turn order & timing
  turnOrder: string[];           // player ids in current order
  turnDirection: 1 | -1;         // 1 clockwise, -1 counter-clockwise
  baseTurnSeconds: number;       // e.g. 15
  activeTurnEndsAt?: number;     // ms timestamp for current turn end
  // Effects
  pendingFastForNextPlayerId?: string; // if set, next player's turn is fast (3s)
  history: Array<{
    playerId: string;
    word: string;
    ok: boolean;
    msTaken: number;
  }>;
  // Game end
  winner?: Player;               // Winner when game is over
  finalStats?: any;
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

// Bonus gain rule
export const STREAK_FOR_BONUS = 3;
