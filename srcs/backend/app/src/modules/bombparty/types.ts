export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  STATE_ERROR: 'STATE_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export interface TypedError {
  t: 'error';
  code: ErrorCode;
  msg: string;
}

export type GamePhase = 'LOBBY' | 'COUNTDOWN' | 'TURN_ACTIVE' | 'RESOLVE' | 'GAME_OVER';

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
    vitesseEclair?: boolean;
    doubleChance?: boolean;
  };
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  currentPlayerId: string;
  currentTrigram: string;
  usedWords: string[];
  turnStartedAt: number;
  turnDurationMs: number;
  turnOrder: string[];
  turnDirection: 1 | -1;
  baseTurnSeconds: number;
  pendingFastForNextPlayerId?: string;
  history: Array<{
    playerId: string;
    word: string;
    ok: boolean;
    msTaken: number;
  }>;
}

export interface GameConfig {
  livesPerPlayer: number;
  turnDurationMs: number;
  playersCount: number;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export interface TurnStartedEvent {
  t: 'turn_started';
  turnStartedAt: number;
  turnDurationMs: number;
  currentPlayerId: string;
}

export interface GameStateSyncEvent {
  t: 'game_state';
  gameState: GameState;
}
