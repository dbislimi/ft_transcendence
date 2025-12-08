import type { ValidationResult } from './types.js';
import { normalizeText, isValidSyllableInWord } from './syllableExtractor.js';
import { wordExistsInDictionary, wordExistsInDictionarySync, getWordSuggestions as getSyllableWordSuggestions, getWordSuggestionsSync as getSyllableWordSuggestionsSync } from './syllableSelector.js';

export async function validateWithDictionary(word: string, syllable: string, usedWords: string[]): Promise<ValidationResult> {
  const normalizedWord = normalizeText(word);
  const normalizedSyllable = normalizeText(syllable);

  if (normalizedWord.length < 3) {
    return { ok: false, reason: 'too_short' };
  }

  if (!isValidSyllableInWord(normalizedWord, normalizedSyllable)) {
    return { ok: false, reason: 'no_syllable' };
  }

  const normalizedUsedWords = usedWords.map(u => normalizeText(u));
  if (normalizedUsedWords.includes(normalizedWord)) {
    return { ok: false, reason: 'duplicate' };
  }

  const validCharsRegex = /^[a-z\-]+$/;
  if (!validCharsRegex.test(normalizedWord)) {
    return { ok: false, reason: 'invalid_chars' };
  }

  const exists = await wordExistsInDictionary(normalizedWord);
  if (!exists) {
    return { ok: false, reason: 'not_in_dictionary' };
  }

  return { ok: true };
}

export function validateWithDictionarySync(word: string, syllable: string, usedWords: string[]): ValidationResult {
  const normalizedWord = normalizeText(word);
  const normalizedSyllable = normalizeText(syllable);

  if (normalizedWord.length < 3) {
    return { ok: false, reason: 'too_short' };
  }

  if (!isValidSyllableInWord(normalizedWord, normalizedSyllable)) {
    return { ok: false, reason: 'no_syllable' };
  }

  const normalizedUsedWords = usedWords.map(u => normalizeText(u));
  if (normalizedUsedWords.includes(normalizedWord)) {
    return { ok: false, reason: 'duplicate' };
  }

  const validCharsRegex = /^[a-z\-]+$/;
  if (!validCharsRegex.test(normalizedWord)) {
    return { ok: false, reason: 'invalid_chars' };
  }

  if (!wordExistsInDictionarySync(normalizedWord)) {
    return { ok: false, reason: 'not_in_dictionary' };
  }

  return { ok: true };
}

export function validateLocal(word: string, syllable: string, usedWords: string[]): ValidationResult {
  const normalizedWord = normalizeText(word);
  const normalizedSyllable = normalizeText(syllable);

  if (normalizedWord.length < 3) {
    return { ok: false, reason: 'too_short' };
  }

  if (!isValidSyllableInWord(normalizedWord, normalizedSyllable)) {
    return { ok: false, reason: 'no_syllable' };
  }

  const normalizedUsedWords = usedWords.map(used => normalizeText(used));
  if (normalizedUsedWords.includes(normalizedWord)) {
    return { ok: false, reason: 'duplicate' };
  }

  const validCharsRegex = /^[a-z\-]+$/;
  if (!validCharsRegex.test(normalizedWord)) {
    return { ok: false, reason: 'invalid_chars' };
  }

  return { ok: true };
}

export async function getWordSuggestions(syllable: string, maxSuggestions: number = 5): Promise<string[]> {
  return await getSyllableWordSuggestions(syllable, maxSuggestions);
}

export function getWordSuggestionsSync(syllable: string, maxSuggestions: number = 5): string[] {
  return getSyllableWordSuggestionsSync(syllable, maxSuggestions);
}

export async function debugDictionary(): Promise<void> {
  const testSyllables = ['maison', 'bon', 'jour', 'eau', 'terre'];
  for (const syllable of testSyllables) {
    const suggestions = await getWordSuggestions(syllable, 3);
    console.log(`Syllabe "${syllable}": ${suggestions.length} suggestions`);
  }
}

export function normalizeTextForGame(text: string): string {
  return normalizeText(text);
}
