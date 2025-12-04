import type {
	GamePhase,
	BonusKey,
	PlayerBonuses,
	Player,
	GameState as SharedGameState,
	GameConfig,
	ValidationResult,
	SyllableDifficulty,
} from "./shared-types.js";

export const ErrorCode = {
	VALIDATION_ERROR: "VALIDATION_ERROR",
	STATE_ERROR: "STATE_ERROR",
	AUTH_ERROR: "AUTH_ERROR",
	NETWORK_ERROR: "NETWORK_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface TypedError {
	t: "error";
	code: ErrorCode;
	msg: string;
}

export type {
	GamePhase,
	BonusKey,
	PlayerBonuses,
	Player,
	GameConfig,
	ValidationResult,
	SyllableDifficulty,
};

export interface GameState extends SharedGameState {
	stateVersion?: number;
	sequenceNumber?: number;
}

export interface TurnStartedEvent {
	t: "turn_started";
	turnStartedAt: number;
	turnDurationMs: number;
	currentPlayerId: string;
}

export interface GameStateSyncEvent {
	t: "game_state";
	gameState: GameState;
}
