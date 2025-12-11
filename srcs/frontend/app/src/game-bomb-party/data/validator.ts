import type { ValidationResult } from "../core/types";

export function normalizeText(text: string): string {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

export function isValidSyllableInWord(word: string, syllable: string): boolean {
	const normalizedWord = normalizeText(word);
	const normalizedSyllable = normalizeText(syllable);

	if (!normalizedWord.includes(normalizedSyllable)) {
		return false;
	}

	if (normalizedWord.includes("-")) {
		const parts = normalizedWord.split("-");
		for (const part of parts) {
			if (part.includes(normalizedSyllable)) {
				return true;
			}
		}
	}

	return true;
}

export function validateLocal(
	word: string,
	syllable: string,
	usedWords: string[]
): ValidationResult {
	const normalizedWord = normalizeText(word);
	const normalizedSyllable = normalizeText(syllable);

	if (normalizedWord.length < 3) {
		return { ok: false, reason: "too_short" };
	}

	if (!isValidSyllableInWord(normalizedWord, normalizedSyllable)) {
		return { ok: false, reason: "no_syllable" };
	}

	const normalizedUsedWords = usedWords.map((used) => normalizeText(used));
	if (normalizedUsedWords.includes(normalizedWord)) {
		return { ok: false, reason: "duplicate" };
	}

	const validCharsRegex = /^[a-z\-]+$/;
	if (!validCharsRegex.test(normalizedWord)) {
		return { ok: false, reason: "invalid_chars" };
	}

	return { ok: true };
}
