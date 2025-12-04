export const STREAK_FOR_BONUS = 3;
export const DEFAULT_LIVES = 3;
export const DEFAULT_TURN_DURATION = 15000;
export const FAST_TURN_DURATION = 3000;
export const MAX_BONUS_PER_TYPE = 2;

export type GamePhase =
	| "LOBBY"
	| "COUNTDOWN"
	| "TURN_ACTIVE"
	| "RESOLVE"
	| "GAME_OVER";
export type BonusKey =
	| "inversion"
	| "plus5sec"
	| "vitesseEclair"
	| "doubleChance"
	| "extraLife";
export type BonusRarity = "common" | "uncommon" | "rare";

export const BONUS_WEIGHTS: Array<[BonusKey, number]> = [
	["extraLife", 5],
	["vitesseEclair", 15],
	["plus5sec", 25],
	["doubleChance", 25],
	["inversion", 30],
];

export const BONUS_RARITY: Record<BonusKey, BonusRarity> = {
	extraLife: "rare",
	vitesseEclair: "uncommon",
	plus5sec: "common",
	doubleChance: "common",
	inversion: "common",
};

export type SyllableDifficulty = "easy" | "medium" | "hard";

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
	isSpectator?: boolean;
	streak: number;
	bonuses: PlayerBonuses;
	pendingEffects?: {
		vitesseEclair?: boolean;
		doubleChance?: boolean;
	};
}

export interface GameConfig {
	livesPerPlayer: number;
	turnDurationMs: number;
	playersCount: number;
}

export interface GameState {
	phase: GamePhase;
	players: Player[];
	currentPlayerIndex: number;
	currentPlayerId: string;
	currentSyllable: string;
	currentSyllableDifficulty?: SyllableDifficulty;
	usedWords: string[];
	turnStartedAt: number;
	turnDurationMs: number;
	turnOrder: string[];
	turnDirection: 1 | -1;
	baseTurnSeconds: number;
	pendingFastForNextPlayerId?: string;
	turnEndsAt?: number;
	activeTurnEndsAt?: number;
	history: Array<{
		playerId: string;
		word: string;
		ok: boolean;
		msTaken: number;
	}>;
	stateVersion?: number;
	sequenceNumber?: number;
}

export interface ValidationResult {
	ok: boolean;
	reason?:
		| "too_short"
		| "no_syllable"
		| "duplicate"
		| "invalid_chars"
		| "not_in_dictionary";
}
