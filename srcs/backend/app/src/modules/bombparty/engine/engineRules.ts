import type { GameState, ValidationResult, BonusKey } from '../types';
import { validateWithDictionarySync } from '../validator.ts';
import { getRandomSyllable } from '../syllableSelector.ts';
import { STREAK_FOR_BONUS } from './engineState.ts';

export function submitWord(
  state: GameState,
  word: string,
  msTaken: number,
  doubleChanceConsumedThisTurn: boolean,
  giveRandomBonus: (playerId: string) => void
): { 
  ok: boolean; 
  reason?: string; 
  consumedDoubleChance?: boolean 
} {
  const validation = validateWithDictionarySync(word, state.currentSyllable, state.usedWords);

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer) {
    return { ok: false, reason: 'no_player' };
  }

  if (validation.ok) {
    state.usedWords.push(word.toLowerCase());
    state.history.push({
      playerId: currentPlayer.id,
      word,
      ok: true,
      msTaken
    });

    currentPlayer.streak = (currentPlayer.streak || 0) + 1;
    if (currentPlayer.streak > 0 && currentPlayer.streak % STREAK_FOR_BONUS === 0) {
      giveRandomBonus(currentPlayer.id);
    }

    state.phase = 'RESOLVE';
    return { ok: true };
  } else {
    state.history.push({
      playerId: currentPlayer.id,
      word,
      ok: false,
      msTaken
    });

    if (currentPlayer?.pendingEffects?.doubleChance && !doubleChanceConsumedThisTurn) {
      if (currentPlayer.pendingEffects) {
        currentPlayer.pendingEffects.doubleChance = false;
      }
      // ne pas changer la phase : le joueur peut reessayer sur le meme tour
      return { ok: false, reason: validation.reason, consumedDoubleChance: true };
    }

    // mot invalide sans double chance : passer a la phase RESOLVE
    state.phase = 'RESOLVE';
    return { ok: false, reason: validation.reason };
  }
}

export function getNewSyllable(lastSyllable: string): string {
  const newSyllable = getRandomSyllable(lastSyllable);
  return newSyllable;
}

export function giveRandomBonus(state: GameState, playerId: string): void {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return;
  
  const keys: BonusKey[] = ['inversion', 'plus5sec', 'vitesseEclair', 'doubleChance', 'extraLife'];
  const key = keys[Math.floor(Math.random() * keys.length)];
  player.bonuses[key] = (player.bonuses[key] || 0) + 1;
}
