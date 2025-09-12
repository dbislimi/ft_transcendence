import type { ValidationResult } from '../core/types';
import trigramWordsData from './trigram_words.json';

// Build English lexicon from trigram -> words[] mapping
const trigramMap = (trigramWordsData as unknown as Record<string, string[]>);

function normalizeText(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

const englishLexicon: Set<string> = new Set(
	Object.values(trigramMap)
		.flat()
		.filter(Boolean)
		.map(w => normalizeText(w))
);

console.log('📚 English lexicon loaded from trigram_words.json:', englishLexicon.size, 'words');
console.log('🔤 Trigram entries:', Object.keys(trigramMap).length);

export function debugDictionary() {
	console.log('🔍 === DICTIONARY DEBUG (EN) ===');
	console.log('📚 Lexicon size:', englishLexicon.size);
	console.log('🔤 Trigram keys:', Object.keys(trigramMap).slice(0, 10));
	const testTrigrams = ['the', 'ing', 'ion', 'est', 'tri'];
	testTrigrams.forEach(trigram => {
		const suggestions = getWordSuggestions(trigram, 3);
		console.log(`🔤 Suggestions for "${trigram}":`, suggestions);
	});
	console.log('🔍 === END DEBUG ===');
}

export function validateWithDictionary(word: string, trigram: string, usedWords: string[]): ValidationResult {
	const normalizedWord = normalizeText(word);
	const normalizedTrigram = normalizeText(trigram);

	if (normalizedWord.length < 3) return { ok: false, reason: 'too_short' };
	if (!normalizedWord.includes(normalizedTrigram)) return { ok: false, reason: 'no_trigram' };

	const normalizedUsedWords = usedWords.map(u => normalizeText(u));
	if (normalizedUsedWords.includes(normalizedWord)) return { ok: false, reason: 'duplicate' };

	// English letters and optional hyphen
	const validCharsRegex = /^[a-z\-]+$/;
	if (!validCharsRegex.test(normalizedWord)) return { ok: false, reason: 'invalid_chars' };

	if (!englishLexicon.has(normalizedWord)) return { ok: false };
	return { ok: true };
}

export function validateLocal(word: string, trigram: string, usedWords: string[]): ValidationResult {
	const normalizedWord = normalizeText(word);
	const normalizedTrigram = normalizeText(trigram);
	if (normalizedWord.length < 3) return { ok: false, reason: 'too_short' };
	if (!normalizedWord.includes(normalizedTrigram)) return { ok: false, reason: 'no_trigram' };
	const normalizedUsedWords = usedWords.map(used => normalizeText(used));
	if (normalizedUsedWords.includes(normalizedWord)) return { ok: false, reason: 'duplicate' };
	const validCharsRegex = /^[a-z\-]+$/;
	if (!validCharsRegex.test(normalizedWord)) return { ok: false, reason: 'invalid_chars' };
	return { ok: true };
}

export function getWordSuggestions(trigram: string, maxSuggestions: number = 5): string[] {
	const normalizedTrigram = normalizeText(trigram);
	const list = trigramMap[normalizedTrigram] || [];
	return list
		.filter((w: string) => typeof w === 'string' && w.length >= 3)
		.map(w => ({ original: w, normalized: normalizeText(w) }))
		.filter(item => item.normalized.includes(normalizedTrigram))
		.sort((a, b) => a.normalized.localeCompare(b.normalized))
		.slice(0, maxSuggestions)
		.map(item => item.original);
}

export function normalizeTextForGame(text: string): string {
	return normalizeText(text);
}