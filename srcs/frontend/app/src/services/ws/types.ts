import type { BonusKey, Player } from '@shared/bombparty/types';
import type { GameState } from '../../game-bomb-party/core/types';

export interface BPAuthMessage {
  event: 'bp:auth';
  payload: {
    playerName: string;
  };
}

export interface BPLobbyCreateMessage {
  event: 'bp:lobby:create';
  payload: {
    name: string;
    isPrivate: boolean;
    password?: string;
    maxPlayers: number;
  };
}

export interface BPLobbyJoinMessage {
  event: 'bp:lobby:join';
  payload: {
    roomId: string;
    password?: string;
  };
}

export interface BPLobbyLeaveMessage {
  event: 'bp:lobby:leave';
  payload: {
    roomId: string;
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
    playerId: string;
    bonusKey: BonusKey;
  };
}

export interface BPRoomSubscribeMessage {
  event: 'bp:room:subscribe';
  payload: {
    roomId: string;
  };
}

export interface BPRoomUnsubscribeMessage {
  event: 'bp:room:unsubscribe';
  payload: {
    roomId: string;
  };
}

export interface BPPingMessage {
  event: 'bp:ping';
  payload: Record<string, never>;
}

export interface BPPongMessage {
  event: 'bp:pong';
  payload: Record<string, never>;
}

export interface BPLobbyListRequestMessage {
  event: 'bp:lobby:list';
  payload: Record<string, never>;
}

export type BPClientMessage =
  | BPAuthMessage
  | BPLobbyCreateMessage
  | BPLobbyJoinMessage
  | BPLobbyLeaveMessage
  | BPLobbyStartMessage
  | BPGameInputMessage
  | BPBonusActivateMessage
  | BPRoomSubscribeMessage
  | BPRoomUnsubscribeMessage
  | BPPingMessage
  | BPPongMessage
  | BPLobbyListRequestMessage;

export interface BPAuthSuccessMessage {
  event: 'bp:auth:success';
  payload: {
    playerId: string;
    playerName: string;
  };
}

export interface BPLobbyCreatedMessage {
  event: 'bp:lobby:created';
  payload: {
    roomId: string;
    playerId: string;
    maxPlayers?: number;
  };
}

export interface BPLobbyJoinedMessage {
  event: 'bp:lobby:joined';
  payload: {
    roomId: string;
    playerId: string;
    players: Array<{ id: string; name: string }>;
    maxPlayers?: number;
  };
}

export interface BPLobbyPlayerJoinedMessage {
  event: 'bp:lobby:player_joined';
  payload: {
    roomId: string;
    players: Array<{ id: string; name: string }>;
    maxPlayers?: number;
  };
}

export interface BPLobbyPlayerLeftMessage {
  event: 'bp:lobby:player_left';
  payload: {
    roomId: string;
    players: Array<{ id: string; name: string }>;
  };
}

export interface BPLobbyErrorMessage {
  event: 'bp:lobby:error';
  payload: {
    error: string;
    code: 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'WRONG_PASSWORD' | 'ALREADY_IN_ROOM' | 'INVALID_REQUEST';
  };
}

export interface BPLobbyListMessage {
  event: 'bp:lobby:list';
  payload: {
    rooms: Array<{
      id: string;
      name: string;
      isPrivate: boolean;
      maxPlayers: number;
      currentPlayers: number;
    }>;
  };
}

export interface BPLobbyListUpdatedMessage {
  event: 'bp:lobby:list_updated';
  payload: {
    rooms: Array<{
      id: string;
      name: string;
      isPrivate: boolean;
      maxPlayers: number;
      currentPlayers: number;
    }>;
  };
}

export interface BPRoomStateMessage {
  event: 'bp:room:state';
  payload: {
    roomId: string;
    players: Array<{ id: string; name: string }>;
    maxPlayers?: number;
  };
}

export interface BPGameStateMessage {
  event: 'bp:game:state';
  payload: {
    roomId: string;
    gameState: GameState;
  };
}

export interface BPGameCountdownMessage {
  event: 'bp:game:countdown';
  payload: {
    roomId: string;
    startTime: number;
    countdownDuration: number;
  };
}

export interface BPGameStartMessage {
  event: 'bp:game:start';
  payload: {
    roomId: string;
  };
}

export interface BPGameWordResultMessage {
  event: 'bp:game:word_result';
  payload: {
    roomId: string;
    word: string;
    valid: boolean;
    reason?: string;
  };
}

export interface BPGameEndMessage {
  event: 'bp:game:end';
  payload: {
    roomId: string;
    winner?: Player;
    reason: 'VICTORY' | 'DISCONNECTION';
    finalStats: Array<{
      playerId: string;
      wordsSubmitted: number;
      validWords: number;
      maxStreak: number;
    }>;
  };
}

export interface BPBonusAppliedMessage {
  event: 'bp:bonus:applied';
  payload: {
    roomId: string;
    playerId: string;
    bonusKey: BonusKey;
    appliedAt: number;
    meta?: {
      extendMs?: number;
      targetId?: string;
      [key: string]: unknown;
    };
  };
}

export interface BPErrorMessage {
  event: 'error';
  payload: {
    error: string;
    code?: string;
  };
}

export interface BPPingServerMessage {
  event: 'bp:ping';
  payload: Record<string, never>;
}

export interface BPPongServerMessage {
  event: 'bp:pong';
  payload: Record<string, never>;
}

export type BPServerMessage =
  | BPAuthSuccessMessage
  | BPLobbyCreatedMessage
  | BPLobbyJoinedMessage
  | BPLobbyPlayerJoinedMessage
  | BPLobbyPlayerLeftMessage
  | BPLobbyErrorMessage
  | BPLobbyListMessage
  | BPLobbyListUpdatedMessage
  | BPRoomStateMessage
  | BPGameStateMessage
  | BPGameCountdownMessage
  | BPGameStartMessage
  | BPGameWordResultMessage
  | BPGameEndMessage
  | BPBonusAppliedMessage
  | BPErrorMessage
  | BPPingServerMessage
  | BPPongServerMessage;

export interface WSMessage {
  event: string;
  payload: unknown;
}

export function isBPClientMessage(message: unknown): message is BPClientMessage {
  if (!message || typeof message !== 'object') return false;
  const msg = message as Record<string, unknown>;
  if (typeof msg.event !== 'string') return false;
  if (!('payload' in msg)) return false;
  return true;
}

export function isBPServerMessage(message: unknown): message is BPServerMessage {
  if (!message || typeof message !== 'object') return false;
  const msg = message as Record<string, unknown>;
  if (typeof msg.event !== 'string') return false;
  if (!('payload' in msg)) return false;
  
  const validEvents = [
    'bp:auth:success',
    'bp:welcome',
    'bp:lobby:created',
    'bp:lobby:joined',
    'bp:lobby:player_joined',
    'bp:lobby:player_left',
    'bp:lobby:error',
    'bp:lobby:host_disconnected',
    'bp:lobby:list',
    'bp:lobby:list_updated',
    'bp:room:state',
    'bp:game:state',
    'bp:game:countdown',
    'bp:game:start',
    'bp:game:word_result',
    'bp:game:end',
    'bp:game:rejoin_prompt',
    'bp:game:input:received',
    'bp:bonus:applied',
    'bp:ping',
    'bp:pong',
    'error',
    'connected',
    'disconnected'
  ];
  
  return validEvents.includes(msg.event);
}

