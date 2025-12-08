import type {
	GameState,
	ValidationResult,
	BonusKey,
	PlayerBonuses,
} from '../types.js';
import { validateWithDictionarySync } from '../validator.js';
import { getRandomSyllable } from '../syllableSelector.js';
import { STREAK_FOR_BONUS } from './engineState.js';
import { BONUS_WEIGHTS, MAX_BONUS_PER_TYPE } from '../shared-types.js';

export function submitWord(
	state: GameState,
	word: string,
	msTaken: number,
	doubleChanceConsumedThisTurn: boolean,
	giveRandomBonus: (playerId: string) => void
): {
	ok: boolean;
	reason?: string;
	consumedDoubleChance?: boolean;
} {
	const validation = validateWithDictionarySync(
		word,
		state.currentSyllable,
		state.usedWords
	);

	const currentPlayer = state.players[state.currentPlayerIndex];
	if (!currentPlayer) {
		return { ok: false, reason: "no_player" };
	}

	if (validation.ok) {
		state.usedWords.push(word.toLowerCase());
		state.history.push({
			playerId: currentPlayer.id,
			word,
			ok: true,
			msTaken,
		});

		currentPlayer.streak = (currentPlayer.streak || 0) + 1;
		if (
			currentPlayer.streak > 0 &&
			currentPlayer.streak % STREAK_FOR_BONUS === 0
		) {
			giveRandomBonus(currentPlayer.id);
		}

		state.phase = "RESOLVE";
		return { ok: true };
	} else {
		state.history.push({
			playerId: currentPlayer.id,
			word,
			ok: false,
			msTaken,
		});

		// double chance: annule la penalite si bonus actif
		if (
			currentPlayer?.pendingEffects?.doubleChance &&
			!doubleChanceConsumedThisTurn
		) {
			if (currentPlayer.pendingEffects) {
				currentPlayer.pendingEffects.doubleChance = false;
			}
			return {
				ok: false,
				reason: validation.reason,
				consumedDoubleChance: true,
			};
		}

		state.phase = "RESOLVE";
		return { ok: false, reason: validation.reason };
	}
}

export function getNewSyllable(lastSyllable: string): string {
	const newSyllable = getRandomSyllable(lastSyllable);
	return newSyllable;
}

function selectWeightedBonus(playerBonuses: PlayerBonuses): BonusKey | null {
	const availableBonuses = BONUS_WEIGHTS.filter(([key]) => {
		const currentCount = playerBonuses[key] || 0;
		return currentCount < MAX_BONUS_PER_TYPE;
	});

	if (availableBonuses.length === 0) {
		return null;
	}

	const totalWeight = availableBonuses.reduce(
		(sum, [, weight]) => sum + weight,
		0
	);

	// selection ponderee: random puis soustrait les poids jusqu'a <= 0
	let random = Math.random() * totalWeight;

	for (const [key, weight] of availableBonuses) {
		random -= weight;
		if (random <= 0) {
			return key;
		}
	}
	// fallback (ne devrait pas arriver)
	return availableBonuses[0][0];
}

export function giveRandomBonus(state: GameState, playerId: string): void {
	const player = state.players.find((p) => p.id === playerId);
	if (!player) return;

	const selectedBonus = selectWeightedBonus(player.bonuses);

	if (selectedBonus) {
		const currentCount = player.bonuses[selectedBonus] || 0;
		if (currentCount < MAX_BONUS_PER_TYPE) {
			player.bonuses[selectedBonus] = currentCount + 1;
		}
	}
}
