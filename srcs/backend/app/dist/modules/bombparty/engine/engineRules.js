import { validateWithDictionary } from '../validator';
import { getRandomTrigram } from '../trigramSelector';
import { STREAK_FOR_BONUS } from './engineState';
export function submitWord(state, word, msTaken, doubleChanceConsumedThisTurn, giveRandomBonus) {
    const validation = validateWithDictionary(word, state.currentTrigram, state.usedWords);
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
    }
    else {
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
            return { ok: false, reason: validation.reason, consumedDoubleChance: true };
        }
        state.phase = 'RESOLVE';
        return { ok: false, reason: validation.reason };
    }
}
export function getNewTrigram(lastTrigram) {
    const newTrigram = getRandomTrigram(lastTrigram);
    return newTrigram;
}
export function giveRandomBonus(state, playerId) {
    const player = state.players.find(p => p.id === playerId);
    if (!player)
        return;
    const keys = ['inversion', 'plus5sec', 'vitesseEclair', 'doubleChance', 'extraLife'];
    const key = keys[Math.floor(Math.random() * keys.length)];
    player.bonuses[key] = (player.bonuses[key] || 0) + 1;
}
