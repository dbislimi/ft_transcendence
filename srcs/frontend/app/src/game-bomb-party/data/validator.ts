import type { ValidationResult } from '../core/types';
import francaisWords from './francais.json';
import { normalizeText, isValidSyllableInWord } from './syllableExtractor';

const frenchLexicon: Set<string> = new Set(
	(Array.isArray(francaisWords) ? francaisWords : [])
		.map(word => normalizeText(word))
		.filter(word => word.length > 0)
);

console.log('[Dict] Dictionnaire français chargé:', frenchLexicon.size, 'mots');

export function debugDictionary() {
	console.log('[Dict] === DICTIONARY DEBUG (FR - Local) ===');
	console.log('[Dict] Dictionnaire français:', frenchLexicon.size, 'mots');
	console.log('[Dict] === END DEBUG ===');
}

export function validateWithDictionary(word: string, syllable: string, usedWords: string[]): ValidationResult {
	const normalizedWord = normalizeText(word);
	const normalizedSyllable = normalizeText(syllable);

	if (normalizedWord.length < 3) return { ok: false, reason: 'too_short' };
	if (!isValidSyllableInWord(normalizedWord, normalizedSyllable)) return { ok: false, reason: 'no_syllable' };

	const normalizedUsedWords = usedWords.map(u => normalizeText(u));
	if (normalizedUsedWords.includes(normalizedWord)) return { ok: false, reason: 'duplicate' };

	const validCharsRegex = /^[a-z\-]+$/;
	if (!validCharsRegex.test(normalizedWord)) return { ok: false, reason: 'invalid_chars' };

	if (!frenchLexicon.has(normalizedWord)) {
		return { ok: false, reason: 'not_in_dictionary' };
	}
	return { ok: true };
}

export function validateLocal(word: string, syllable: string, usedWords: string[]): ValidationResult {
	const normalizedWord = normalizeText(word);
	const normalizedSyllable = normalizeText(syllable);
	if (normalizedWord.length < 3) return { ok: false, reason: 'too_short' };
	if (!isValidSyllableInWord(normalizedWord, normalizedSyllable)) return { ok: false, reason: 'no_syllable' };
	const normalizedUsedWords = usedWords.map(used => normalizeText(used));
	if (normalizedUsedWords.includes(normalizedWord)) return { ok: false, reason: 'duplicate' };
	const validCharsRegex = /^[a-z\-]+$/;
	if (!validCharsRegex.test(normalizedWord)) return { ok: false, reason: 'invalid_chars' };
	return { ok: true };
}

export function getWordSuggestions(syllable: string, maxSuggestions: number = 5): string[] {
	const normalizedSyllable = normalizeText(syllable);
	const suggestions: string[] = [];
	for (const word of frenchLexicon) {
		if (isValidSyllableInWord(word, normalizedSyllable) && word.length >= 3) {
			suggestions.push(word);
			if (suggestions.length >= maxSuggestions) break;
		}
	}
	return suggestions;
}

export function normalizeTextForGame(text: string): string {
	return normalizeText(text);
}
