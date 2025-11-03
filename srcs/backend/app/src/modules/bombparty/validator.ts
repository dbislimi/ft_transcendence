import type { ValidationResult } from './types.ts';
import fs from 'fs';

// Load JSON via fs to avoid Node ESM import assertion requirement (import ... assert { type: 'json' })
const trigramWordsData = JSON.parse(
  fs.readFileSync(new URL('./data/trigram_words.json', import.meta.url), 'utf8')
) as Record<string, string[]>;

const trigramMap = trigramWordsData as Record<string, string[]>;

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[00-\u036f]/g, '')
    .toLowerCase();
}

const englishLexicon: Set<string> = new Set(
  Object.values(trigramMap)
    .flat()
    .filter(Boolean)
    .map(w => normalizeText(w))
);


export function validateWithDictionary(word: string, trigram: string, usedWords: string[]): ValidationResult {
  const normalizedWord = normalizeText(word);
  const normalizedTrigram = normalizeText(trigram);

  if (normalizedWord.length < 3) {
    return { ok: false, reason: 'too_short' };
  }

  if (!normalizedWord.includes(normalizedTrigram)) {
    return { ok: false, reason: 'no_trigram' };
  }

  const normalizedUsedWords = usedWords.map(u => normalizeText(u));
  if (normalizedUsedWords.includes(normalizedWord)) {
    return { ok: false, reason: 'duplicate' };
  }

  const validCharsRegex = /^[a-z\-]+$/;
  if (!validCharsRegex.test(normalizedWord)) {
    return { ok: false, reason: 'invalid_chars' };
  }

  if (!englishLexicon.has(normalizedWord)) {
    return { ok: false };
  }

  return { ok: true };
}

export function validateLocal(word: string, trigram: string, usedWords: string[]): ValidationResult {
  const normalizedWord = normalizeText(word);
  const normalizedTrigram = normalizeText(trigram);

  if (normalizedWord.length < 3) {
    return { ok: false, reason: 'too_short' };
  }

  if (!normalizedWord.includes(normalizedTrigram)) {
    return { ok: false, reason: 'no_trigram' };
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

export function debugDictionary(): void {
  const testTrigrams = ['the', 'ing', 'ion', 'est', 'tri'];
  testTrigrams.forEach(trigram => {
    const suggestions = getWordSuggestions(trigram, 3);
  });
}

export function normalizeTextForGame(text: string): string {
  return normalizeText(text);
}
