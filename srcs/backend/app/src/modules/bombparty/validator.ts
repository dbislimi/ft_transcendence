import type { ValidationResult } from './types.ts';
import { normalizeText } from './syllableExtractor.ts';
import { wordExistsInDictionary, wordExistsInDictionarySync, getWordSuggestions as getSyllableWordSuggestions, getWordSuggestionsSync as getSyllableWordSuggestionsSync } from './syllableSelector.ts';

// valide un mot avec le dictionnaire francais
// verifie que le mot contient la syllabe demandee ET existe dans le dictionnaire
export async function validateWithDictionary(word: string, syllable: string, usedWords: string[]): Promise<ValidationResult> {
  const normalizedWord = normalizeText(word);
  const normalizedSyllable = normalizeText(syllable);

  if (normalizedWord.length < 3) {
    return { ok: false, reason: 'too_short' };
  }

  if (!normalizedWord.includes(normalizedSyllable)) {
    return { ok: false, reason: 'no_syllable' };
  }

  const normalizedUsedWords = usedWords.map(u => normalizeText(u));
  if (normalizedUsedWords.includes(normalizedWord)) {
    return { ok: false, reason: 'duplicate' };
  }

  // accepte les lettres francaises (avec accents normalises) et les tirets
  const validCharsRegex = /^[a-z\-]+$/;
  if (!validCharsRegex.test(normalizedWord)) {
    return { ok: false, reason: 'invalid_chars' };
  }

  // verifie que le mot existe dans le dictionnaire francais (avec lazy loading)
  const exists = await wordExistsInDictionary(normalizedWord);
  if (!exists) {
    return { ok: false, reason: 'not_in_dictionary' };
  }

  return { ok: true };
}

// Version synchrone pour compatibilité (utilise le Set en mémoire)
// À utiliser uniquement pour des validations rapides, pas pour la validation finale
export function validateWithDictionarySync(word: string, syllable: string, usedWords: string[]): ValidationResult {
  const normalizedWord = normalizeText(word);
  const normalizedSyllable = normalizeText(syllable);

  if (normalizedWord.length < 3) {
    return { ok: false, reason: 'too_short' };
  }

  if (!normalizedWord.includes(normalizedSyllable)) {
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

  // Utilise wordExistsInDictionarySync pour compatibilité
  if (!wordExistsInDictionarySync(normalizedWord)) {
    return { ok: false, reason: 'not_in_dictionary' };
  }

  return { ok: true };
}

// validation locale sans dictionnaire (pour tests rapides)
export function validateLocal(word: string, syllable: string, usedWords: string[]): ValidationResult {
  const normalizedWord = normalizeText(word);
  const normalizedSyllable = normalizeText(syllable);

  if (normalizedWord.length < 3) {
    return { ok: false, reason: 'too_short' };
  }

  if (!normalizedWord.includes(normalizedSyllable)) {
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

// obtient des suggestions de mots pour une syllabe
export async function getWordSuggestions(syllable: string, maxSuggestions: number = 5): Promise<string[]> {
  return await getSyllableWordSuggestions(syllable, maxSuggestions);
}

// Version synchrone pour compatibilité
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
