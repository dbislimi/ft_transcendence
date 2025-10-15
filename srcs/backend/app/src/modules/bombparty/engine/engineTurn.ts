import type { GameState, BonusKey } from '../types';
import { FAST_TURN_DURATION } from './engineState';

export function getTurnDurationForCurrentPlayer(state: GameState): number {
  const base = state.baseTurnSeconds * 1000;
  const currentId = state.players[state.currentPlayerIndex]?.id;
  
  if (currentId && state.pendingFastForNextPlayerId === currentId) {
    return FAST_TURN_DURATION;
  }
  
  return base;
}

export function activateBonus(state: GameState, playerId: string, bonusKey: BonusKey): { ok: boolean; meta?: any } {
  const player = state.players.find(p => p.id === playerId);
  if (!player) {
    return { ok: false };
  }
  
  if (!player.bonuses[bonusKey] || player.bonuses[bonusKey] <= 0) {
    return { ok: false };
  }

  switch (bonusKey) {
    case 'inversion':
      state.turnDirection = state.turnDirection === 1 ? -1 : 1;
      player.bonuses.inversion -= 1;
      return { ok: true };
      
    case 'plus5sec':
      if (state.phase === 'TURN_ACTIVE') {
        state.turnDurationMs += 5000;
        player.bonuses.plus5sec -= 1;
        return { ok: true, meta: { extendMs: 5000 } };
      }
      return { ok: false };
      
    case 'vitesseEclair':
      const targetIdx = peekNextAliveIndex(state);
      const targetId = targetIdx >= 0 ? state.players[targetIdx].id : undefined;
      if (targetId) {
        state.pendingFastForNextPlayerId = targetId;
        player.bonuses.vitesseEclair -= 1;
        return { ok: true, meta: { targetId } };
      }
      return { ok: false };
      
    case 'doubleChance':
      player.pendingEffects = player.pendingEffects || {};
      player.pendingEffects.doubleChance = true;
      player.bonuses.doubleChance -= 1;
      return { ok: true };
      
    case 'extraLife':
      if (player.isEliminated) return { ok: false };
      player.lives = Math.min(player.lives + 1, 9);
      player.bonuses.extraLife -= 1;
      return { ok: true };
      
    default:
      return { ok: false };
  }
}

export function peekNextAliveIndex(state: GameState): number {
  if (state.players.length === 0) return -1;
  
  let idx = state.currentPlayerIndex;
  const len = state.players.length;
  
  for (let i = 0; i < len; i++) {
    const step = state.turnDirection === 1 ? 1 : -1;
    idx = (idx + step + len) % len;
    if (!state.players[idx].isEliminated) return idx;
  }
  
  return -1;
}
