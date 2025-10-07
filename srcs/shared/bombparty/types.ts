/*
  Types partager pour le module Bomb Party
  Utiliser par le frontend et le backend
 */


export const STREAK_FOR_BONUS = 3;
export const DEFAULT_LIVES = 3;
export const DEFAULT_TURN_DURATION = 15000;
export const FAST_TURN_DURATION = 3000;

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
  turnOrder: string[];
  turnDirection: 1 | -1;
  baseTurnSeconds: number;
  activeTurnEndsAt?: number;
  pendingFastForNextPlayerId?: string;
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

//  WebSocket Protocol Types 

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


// Server -> Client messages
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

//  Room & Lobby Types 
export interface Room {
  id: string;
  name: string;
  isPrivate: boolean;
  password?: string;
  maxPlayers: number;
  players: Map<string, { id: string; name: string; ws: any }>;
  gameEngine?: any; // BombPartyEngine instance
  createdAt: number;
  startedAt?: number;
}

//  Database Types 
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
