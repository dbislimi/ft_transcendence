import type { GameState } from '../types';
import { getAlivePlayers, isGameOver } from './engineState.ts';
import { bombPartyLogger } from '../log.ts';
import { getSyllableDifficulty } from '../syllableSelector.ts';

export function startCountdown(state: GameState): void {
  state.phase = 'COUNTDOWN';
}

export function startTurn(state: GameState, getNewSyllable: () => string, getTurnDuration: () => number): void {
  if (state.players[state.currentPlayerIndex]?.isEliminated) {
    nextPlayer(state);
    if (state.players[state.currentPlayerIndex]?.isEliminated) {
      state.phase = 'GAME_OVER';
      return;
    }
  }

  state.currentSyllable = getNewSyllable();
  state.currentSyllableDifficulty = getSyllableDifficulty(state.currentSyllable);
  state.phase = 'TURN_ACTIVE';

  const duration = getTurnDuration();
  const now = Date.now();
  state.turnStartedAt = now;
  state.turnDurationMs = duration;
  state.currentPlayerId = state.players[state.currentPlayerIndex]?.id || '';

  // reset du bonus vitesse eclair si c'est le tour du joueur cible
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
    bombPartyLogger.error({ currentPlayerIndex: state.currentPlayerIndex, playersCount: state.players.length }, 'No player or invalid index in resolveTurn');
    return;
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer) {
    bombPartyLogger.error({ currentPlayerIndex: state.currentPlayerIndex }, 'Current player not found in resolveTurn');
    return;
  }

  bombPartyLogger.info({ 
    playerId: currentPlayer.id, 
    playerName: currentPlayer.name, 
    wordValid, 
    timeExpired, 
    currentLives: currentPlayer.lives 
  }, '[resolveTurn] Début de résolution du tour');

  if (!wordValid || timeExpired) {
    const livesBefore = currentPlayer.lives;
    currentPlayer.streak = 0;
    currentPlayer.lives = Math.max(0, currentPlayer.lives - 1);
    
    bombPartyLogger.info({ 
      playerId: currentPlayer.id, 
      playerName: currentPlayer.name, 
      livesBefore, 
      livesAfter: currentPlayer.lives, 
      reason: timeExpired ? 'Timer expiré' : 'Mot invalide' 
    }, '[resolveTurn] Perte de vie détectée');
    
    if (currentPlayer.lives === 0) {
      currentPlayer.isEliminated = true;
      currentPlayer.isSpectator = true;
      bombPartyLogger.info({ playerId: currentPlayer.id, playerName: currentPlayer.name }, '[resolveTurn] Joueur éliminé');
    }
  }

  const alivePlayers = getAlivePlayers(state);
  if (alivePlayers.length <= 1) {
    state.phase = 'GAME_OVER';
    bombPartyLogger.info({ alivePlayers: alivePlayers.length }, '[resolveTurn] Partie terminée');
    return;
  }

  nextPlayerFn();
  startTurnFn();
}

export function nextPlayer(state: GameState): void {
  if (state.players.length === 0) return;
  
  let attempts = 0;
  const maxAttempts = state.players.length * 2;
  
  // boucle pour sauter les joueurs elimines, protection contre boucle infinie
  do {
    const step = state.turnDirection === 1 ? 1 : -1;
    const len = state.players.length;
    state.currentPlayerIndex = (state.currentPlayerIndex + step + len) % len;
    attempts++;
    
    if (attempts > maxAttempts) {
      bombPartyLogger.error({ attempts, maxAttempts, playersCount: state.players.length }, 'Cannot find next player');
      break;
    }
  } while (state.players[state.currentPlayerIndex]?.isEliminated);

  if (!state.players[state.currentPlayerIndex]) {
    bombPartyLogger.error({ currentPlayerIndex: state.currentPlayerIndex, playersCount: state.players.length }, 'No valid player found');
    state.phase = 'GAME_OVER';
  }
}

export function isTurnExpired(state: GameState): boolean {
  if (state.phase !== 'TURN_ACTIVE') return false;
  const now = Date.now();
  const turnEndsAt = state.turnStartedAt + state.turnDurationMs;
  const isExpired = now >= turnEndsAt;
  
  if (isExpired) {
    const currentPlayer = state.players[state.currentPlayerIndex];
    bombPartyLogger.info({ 
      now, 
      turnStartedAt: state.turnStartedAt, 
      turnDurationMs: state.turnDurationMs, 
      turnEndsAt, 
      elapsedMs: now - state.turnStartedAt,
      currentPlayer: currentPlayer?.name,
      currentPlayerId: currentPlayer?.id 
    }, '[isTurnExpired] Tour expiré détecté');
  }
  
  return isExpired;
}

export function checkAndEndExpiredTurn(
  state: GameState,
  resolveTurnFn: (wordValid: boolean, timeExpired: boolean) => void
): boolean {
  if (isTurnExpired(state)) {
    bombPartyLogger.info({ 
      currentPlayerId: state.players[state.currentPlayerIndex]?.id,
      currentPlayerName: state.players[state.currentPlayerIndex]?.name 
    }, '[checkAndEndExpiredTurn] Appel de resolveTurn pour expiration du timer');
    resolveTurnFn(false, true);
    return true;
  }
  return false;
}
