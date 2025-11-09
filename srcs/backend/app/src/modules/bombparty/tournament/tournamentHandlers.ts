import type { BombPartyTournamentManager } from './BombPartyTournamentManager.ts';
import { bombPartyLogger } from '../log.ts';
import { ErrorCode } from '../types.ts';

interface TournamentHandlerContext {
  tournamentManager: BombPartyTournamentManager;
  sendMessage: (event: string, payload: any) => void;
  sendError: (error: string, code?: ErrorCode) => void;
}

// gere la creation d'un tournoi
export function handleCreateTournament(
  playerId: string,
  playerName: string,
  ws: any,
  payload: {
    tournamentId: string;
    capacity: number;
    password?: string;
  },
  context: TournamentHandlerContext
): { success: boolean; error?: string } {
  const { tournamentManager, sendMessage, sendError } = context;

  bombPartyLogger.info({ 
    playerId, 
    tournamentId: payload.tournamentId,
    capacity: payload.capacity
  }, 'handleCreateTournament called');

  // Validate capacity
  if (!payload.capacity || payload.capacity < 4 || payload.capacity > 32) {
    sendError('Capacity must be between 4 and 32', ErrorCode.VALIDATION_ERROR);
    return;
  }

  // Validate capacity is even
  if (payload.capacity % 2 !== 0) {
    sendError('Capacity must be an even number', ErrorCode.VALIDATION_ERROR);
    return;
  }

  // Create tournament
  const createResult = tournamentManager.createTournament(
    playerId,
    payload.tournamentId,
    payload.capacity,
    payload.password
  );

  if (!createResult.success) {
    sendError(createResult.error || 'Failed to create tournament', ErrorCode.STATE_ERROR);
    return { success: false, error: createResult.error };
  }

  // auto-join le createur
  const joinResult = tournamentManager.joinTournament(
    playerId,
    playerName,
    ws,
    payload.tournamentId,
    payload.password
  );

  if (!joinResult.success) {
    sendError(joinResult.error || 'Failed to join tournament', ErrorCode.STATE_ERROR);
    return { success: false, error: joinResult.error };
  }

  sendMessage('bp:tournament:created', {
    tournamentId: payload.tournamentId,
    capacity: payload.capacity,
    isPrivate: !!payload.password,
    playerId
  });

  sendMessage('bp:tournament:joined', {
    tournamentId: payload.tournamentId,
    playerId,
    tournament: joinResult.tournament,
    isCreator: true
  });

  bombPartyLogger.info({ 
    tournamentId: payload.tournamentId, 
    playerId 
  }, 'Tournament created and joined');
  return { success: true };
}

// gere le join d'un tournoi
export function handleJoinTournament(
  playerId: string,
  playerName: string,
  ws: any,
  payload: {
    tournamentId: string;
    password?: string;
  },
  context: TournamentHandlerContext
): { success: boolean; error?: string } {
  const { tournamentManager, sendMessage, sendError } = context;

  bombPartyLogger.info({ 
    playerId, 
    tournamentId: payload.tournamentId 
  }, 'handleJoinTournament called');

  const result = tournamentManager.joinTournament(
    playerId,
    playerName,
    ws,
    payload.tournamentId,
    payload.password
  );

  if (!result.success) {
    sendError(result.error || 'Failed to join tournament', ErrorCode.STATE_ERROR);
    return { success: false, error: result.error };
  }

  sendMessage('bp:tournament:joined', {
    tournamentId: payload.tournamentId,
    playerId,
    tournament: result.tournament
  });

  bombPartyLogger.info({ 
    tournamentId: payload.tournamentId, 
    playerId 
  }, 'Player joined tournament');
  return { success: true };
}

// gere le leave d'un tournoi
export function handleLeaveTournament(
  playerId: string,
  payload: {
    tournamentId: string;
  },
  context: TournamentHandlerContext
): { success: boolean; error?: string } {
  const { tournamentManager, sendMessage, sendError } = context;

  bombPartyLogger.info({ 
    playerId, 
    tournamentId: payload.tournamentId 
  }, 'handleLeaveTournament called');

  const result = tournamentManager.leaveTournament(playerId, payload.tournamentId);

  if (!result.success) {
    sendError(result.error || 'Failed to leave tournament', ErrorCode.STATE_ERROR);
    return { success: false, error: result.error };
  }

  sendMessage('bp:tournament:left', {
    tournamentId: payload.tournamentId,
    playerId
  });

  bombPartyLogger.info({ 
    tournamentId: payload.tournamentId, 
    playerId 
  }, 'Player left tournament');
  return { success: true };
}

// gere le demarrage d'un tournoi
export function handleStartTournament(
  playerId: string,
  payload: {
    tournamentId: string;
  },
  context: TournamentHandlerContext
): void {
  const { tournamentManager, sendError } = context;

  bombPartyLogger.info({ 
    playerId, 
    tournamentId: payload.tournamentId 
  }, 'handleStartTournament called');

  const result = tournamentManager.startTournament(playerId, payload.tournamentId);

  if (!result.success) {
    sendError(result.error || 'Failed to start tournament', ErrorCode.STATE_ERROR);
    return;
  }

  // No need to send message here, BombPartyTournament will broadcast to all players
  bombPartyLogger.info({ 
    tournamentId: payload.tournamentId, 
    playerId 
  }, 'Tournament start initiated');
}

// gere le statut d'un tournoi
export function handleGetTournamentStatus(
  playerId: string,
  payload: {
    tournamentId: string;
  },
  context: TournamentHandlerContext
): void {
  const { tournamentManager, sendMessage, sendError } = context;

  bombPartyLogger.info({ 
    playerId, 
    tournamentId: payload.tournamentId 
  }, 'handleGetTournamentStatus called');

  const result = tournamentManager.getTournamentStatus(payload.tournamentId);

  if (!result.success) {
    sendError(result.error || 'Failed to get tournament status', ErrorCode.STATE_ERROR);
    return;
  }

  sendMessage('bp:tournament:status', {
    tournamentId: payload.tournamentId,
    tournament: result.tournament,
    bracket: result.bracket,
    status: result.tournament?.status,
    currentRound: result.bracket?.currentRound
  });

  bombPartyLogger.info({ 
    tournamentId: payload.tournamentId, 
    playerId 
  }, 'Tournament status sent');
}

// gere le listing des tournois
export function handleListTournaments(
  playerId: string,
  context: TournamentHandlerContext
): void {
  const { tournamentManager, sendMessage } = context;

  bombPartyLogger.info({ playerId }, 'handleListTournaments called');

  const result = tournamentManager.listTournaments();

  sendMessage('bp:tournament:list', {
    tournaments: result.tournaments || []
  });

  bombPartyLogger.info({ 
    playerId,
    count: result.tournaments?.length || 0
  }, 'Tournament list sent');
}
