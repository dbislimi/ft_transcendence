import type { GameState } from '../types';
import { getAlivePlayers, isGameOver } from './engineState';

export function startCountdown(state: GameState): void {
  state.phase = 'COUNTDOWN';
}

export function startTurn(state: GameState, getNewTrigram: () => string, getTurnDuration: () => number): void {
  if (state.players[state.currentPlayerIndex]?.isEliminated) {
    nextPlayer(state);
    if (state.players[state.currentPlayerIndex]?.isEliminated) {
      state.phase = 'GAME_OVER';
      return;
    }
  }

  state.currentTrigram = getNewTrigram();
  state.phase = 'TURN_ACTIVE';

  const duration = getTurnDuration();
  const now = Date.now();
  state.turnStartedAt = now;
  state.turnDurationMs = duration;
  state.currentPlayerId = state.players[state.currentPlayerIndex]?.id || '';

  const currentId = state.players[state.currentPlayerIndex]?.id;
  if (currentId && state.pendingFastForNextPlayerId === currentId) {
    state.pendingFastForNextPlayerId = undefined;
  }
}

export function resolveTurn(
  state: GameState, 
  wordValid: boolean, 
  timeExpired: boolean,
  nextPlayerFn: () => void,
  startTurnFn: () => void
): void {
  if (state.players.length === 0 || state.currentPlayerIndex >= state.players.length) {
    console.error('[BombParty] Erreur: Aucun joueur ou index invalide');
    return;
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer) {
    console.error('[BombParty] Erreur: Joueur actuel non trouvé');
    return;
  }

  if (!wordValid || timeExpired) {
    currentPlayer.streak = 0;
    currentPlayer.lives = Math.max(0, currentPlayer.lives - 1);
    if (currentPlayer.lives === 0) {
      currentPlayer.isEliminated = true;
    }
  }

  const alivePlayers = getAlivePlayers(state);
  if (alivePlayers.length <= 1) {
    state.phase = 'GAME_OVER';
    return;
  }

  nextPlayerFn();
  startTurnFn();
}

export function nextPlayer(state: GameState): void {
  if (state.players.length === 0) return;
  
  let attempts = 0;
  const maxAttempts = state.players.length * 2;
  
  do {
    const step = state.turnDirection === 1 ? 1 : -1;
    const len = state.players.length;
    state.currentPlayerIndex = (state.currentPlayerIndex + step + len) % len;
    attempts++;
    
    if (attempts > maxAttempts) {
      console.error('[BombParty] Erreur: Impossible de trouver le prochain joueur');
      break;
    }
  } while (state.players[state.currentPlayerIndex]?.isEliminated);

  if (!state.players[state.currentPlayerIndex]) {
    console.error('[BombParty] Erreur: Aucun joueur valide trouvé');
    state.phase = 'GAME_OVER';
  }
}

export function isTurnExpired(state: GameState): boolean {
  if (state.phase !== 'TURN_ACTIVE') return false;
  return Date.now() >= state.turnStartedAt + state.turnDurationMs;
}

export function checkAndEndExpiredTurn(
  state: GameState,
  resolveTurnFn: (wordValid: boolean, timeExpired: boolean) => void
): boolean {
  if (isTurnExpired(state)) {
    resolveTurnFn(false, true);
    return true;
  }
  return false;
}
