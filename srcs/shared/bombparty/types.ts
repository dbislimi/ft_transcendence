export const STREAK_FOR_BONUS = 3;
export const DEFAULT_LIVES = 3;
export const DEFAULT_TURN_DURATION = 15000;
export const FAST_TURN_DURATION = 3000;
export const MAX_BONUS_PER_TYPE = 2;

export type GamePhase = 'LOBBY' | 'COUNTDOWN' | 'TURN_ACTIVE' | 'RESOLVE' | 'GAME_OVER';
export type BonusKey = 'inversion' | 'plus5sec' | 'vitesseEclair' | 'doubleChance' | 'extraLife';
export type BonusRarity = 'common' | 'uncommon' | 'rare';

export const BONUS_WEIGHTS: Array<[BonusKey, number]> = [
  ['extraLife', 5],
  ['vitesseEclair', 15],
  ['plus5sec', 25],
  ['doubleChance', 25],
  ['inversion', 30],
];

export const BONUS_RARITY: Record<BonusKey, BonusRarity> = {
  extraLife: 'rare',
  vitesseEclair: 'uncommon',
  plus5sec: 'common',
  doubleChance: 'common',
  inversion: 'common',
};
export type SyllableDifficulty = 'easy' | 'medium' | 'hard';

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
  reason?: 'too_short' | 'no_syllable' | 'duplicate' | 'invalid_chars' | 'not_in_dictionary';
}

export interface BPLobbyCreateMessage {
  event: 'bp:lobby:create';
  payload: {
    name: string;
    isPrivate: boolean;
    password?: string;
    maxPlayers?: number;
  };
}

export interface BPLobbyJoinMessage {
  event: 'bp:lobby:join';
  payload: {
    roomId: string;
    password?: string;
  };
}

export interface BPLobbyStartMessage {
  event: 'bp:lobby:start';
  payload: {
    roomId: string;
  };
}

export interface BPGameInputMessage {
  event: 'bp:game:input';
  payload: {
    roomId: string;
    word: string;
    msTaken: number;
  };
}

export interface BPBonusActivateMessage {
  event: 'bp:bonus:activate';
  payload: {
    roomId: string;
    bonusKey: BonusKey;
  };
}

export type BPClientMessage =
  | BPLobbyCreateMessage
  | BPLobbyJoinMessage
  | BPLobbyStartMessage
  | BPGameInputMessage
  | BPBonusActivateMessage;


export interface BPLobbyCreatedMessage {
  event: 'bp:lobby:created';
  payload: {
    roomId: string;
    playerId: string;
  };
}

export interface BPLobbyJoinedMessage {
  event: 'bp:lobby:joined';
  payload: {
    roomId: string;
    playerId: string;
    players: Array<{ id: string; name: string }>;
  };
}

export interface BPLobbyErrorMessage {
  event: 'bp:lobby:error';
  payload: {
    error: string;
    code: 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'WRONG_PASSWORD' | 'ALREADY_IN_ROOM';
  };
}

export interface BPGameStateMessage {
  event: 'bp:game:state';
  payload: {
    roomId: string;
    gameState: GameState;
  };
}

export interface BPGameEndMessage {
  event: 'bp:game:end';
  payload: {
    roomId: string;
    winner?: Player;
    reason: 'VICTORY' | 'DISCONNECTION';
    finalStats: {
      playerId: string;
      wordsSubmitted: number;
      validWords: number;
      maxStreak: number;
    }[];
  };
}

export interface BPBonusAppliedMessage {
  event: 'bp:bonus:applied';
  payload: {
    roomId: string;
    playerId: string;
    bonusKey: BonusKey;
    appliedAt: number;
    meta?: any;
  };
}

export type BPServerMessage =
  | BPLobbyCreatedMessage
  | BPLobbyJoinedMessage
  | BPLobbyErrorMessage
  | BPGameStateMessage
  | BPGameEndMessage
  | BPBonusAppliedMessage;

export interface Room {
  id: string;
  name: string;
  isPrivate: boolean;
  password?: string;
  maxPlayers: number;
  players: Map<string, { id: string; name: string; ws: any }>;
  gameEngine?: any;
  createdAt: number;
  startedAt?: number;
}

export interface BPMatch {
  id: number;
  room_id: string;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  winner_id?: string;
  total_rounds: number;
  final_state: string;
}

export interface BPParticipant {
  id: number;
  match_id: number;
  player_id: string;
  player_name: string;
  words_submitted: number;
  valid_words: number;
  max_streak: number;
  final_lives: number;
  is_eliminated: boolean;
}


export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type BadgeType = 
  | 'first_win'
  | 'streak_10'
  | 'streak_20'
  | 'perfect_game'
  | 'speed_demon'
  | 'word_master'
  | 'survivor'
  | 'centurion'
  | 'undefeated'
  | 'trigram_expert';

export interface Badge {
  id: string;
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  unlockedAt?: Date;
}

export interface Level {
  level: number;
  xpRequired: number;
  title: string;
  rewards?: {
    themes?: string[];
    avatars?: string[];
  };
}

export interface UserProgress {
  userId: number;
  level: number;
  currentXp: number;
  totalXp: number;
  xpToNextLevel: number;
  badges: Badge[];
  unlockedThemes: string[];
  unlockedAvatars: string[];
  currentTheme?: string;
  currentAvatar?: string;
  streak: number;
  longestStreak: number;
  lastWinStreak?: number;
}

export interface Achievement {
  id: string;
  badgeType: BadgeType;
  condition: (stats: any) => boolean;
  description: string;
}


