import fs from 'fs';
import { normalizeText, isValidSyllableInWord } from './syllableExtractor.js';
import { getDictionaryManager } from './dictionaryManager.js';

const francaisWordsPath = new URL('./data/francais.txt', import.meta.url);
const francaisWordsData = fs.readFileSync(francaisWordsPath, 'utf8');

const frenchLexicon: Set<string> = new Set(
  francaisWordsData
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(word => normalizeText(word))
);

const syllablesPath = new URL('./data/syllabes.txt', import.meta.url);

if (!fs.existsSync(syllablesPath)) {
  throw new Error(`[BP] ERREUR CRITIQUE: Le fichier syllabes.txt est introuvable à ${syllablesPath.pathname}. Veuillez executer generateSyllables.ts pour le creer.`);
}

const syllablesData = fs.readFileSync(syllablesPath, 'utf8');
const availableFragments: string[] = syllablesData
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0)
  .map(syllable => normalizeText(syllable));

if (availableFragments.length === 0) {
  throw new Error('[BP] ERREUR CRITIQUE: Le fichier syllabes.txt est vide. Veuillez executer generateSyllables.ts pour le regenerer.');
}

console.log(`[BP] ✓ ${availableFragments.length} syllabes valides chargees depuis syllabes.txt`);
console.log(`[BP] Exemples de syllabes: ${availableFragments.slice(0, 5).join(', ')}...`);

const fragmentIndex: Map<string, Set<string>> = new Map();
const validSyllablesSet = new Set(availableFragments);

console.log('[BP] Initialisation de l\'index des fragments pour les syllabes valides...');
let wordCount = 0;
for (const word of frenchLexicon) {
  if (word.length >= 3) {
    const normalized = normalizeText(word);
    for (let len = 2; len <= Math.min(4, normalized.length); len++) {
      for (let i = 0; i <= normalized.length - len; i++) {
        const fragment = normalized.substring(i, i + len);
        if (validSyllablesSet.has(fragment)) {
          if (!fragmentIndex.has(fragment)) {
            fragmentIndex.set(fragment, new Set());
          }
          fragmentIndex.get(fragment)!.add(word);
        }
      }
    }
    wordCount++;
    if (wordCount % 5000 === 0) {
      console.log(`[BP] Traite ${wordCount} mots...`);
    }
  }
}

console.log(`[BP] Index des fragments initialise pour ${fragmentIndex.size} syllabes valides`);
const MIN_WORDS_REQUIRED = 800;
const filteredSyllables: string[] = availableFragments.filter(s => {
  const words = fragmentIndex.get(normalizeText(s));
  return words && words.size >= MIN_WORDS_REQUIRED;
});

console.log(`[BP] ✓ ${filteredSyllables.length} syllabes avec >= ${MIN_WORDS_REQUIRED} mots disponibles`);

if (filteredSyllables.length === 0) {
  throw new Error(`[BP] ERREUR CRITIQUE: Aucune syllabe avec >= ${MIN_WORDS_REQUIRED} mots disponibles.`);
}

const recentSyllablesHistory: string[] = [];
const MAX_HISTORY_SIZE = 15;

export function getRandomSyllable(excludeSyllable?: string): string {
  if (filteredSyllables.length === 0) {
    throw new Error(`[BP] ERREUR: Aucune syllabe disponible avec >= ${MIN_WORDS_REQUIRED} mots.`);
  }

  const normalizedExclude = excludeSyllable ? normalizeText(excludeSyllable) : undefined;
  
  const excludeSet = new Set<string>();
  if (normalizedExclude) {
    excludeSet.add(normalizedExclude);
  }
  recentSyllablesHistory.forEach(s => excludeSet.add(normalizeText(s)));
  
  let candidates = filteredSyllables.filter(s => !excludeSet.has(normalizeText(s)));
  
  if (candidates.length === 0) {
    console.log('[BP] Toutes les syllabes sont recentes, reduction de l\'historique...');
    recentSyllablesHistory.splice(0, Math.floor(MAX_HISTORY_SIZE / 2));
    excludeSet.clear();
    if (normalizedExclude) {
      excludeSet.add(normalizedExclude);
    }
    recentSyllablesHistory.forEach(s => excludeSet.add(normalizeText(s)));
    candidates = filteredSyllables.filter(s => !excludeSet.has(normalizeText(s)));
  }
  
  const pool = candidates.length > 0 ? candidates : filteredSyllables;
  
  const selected = pool[Math.floor(Math.random() * pool.length)];
  const selectedNormalized = normalizeText(selected);
  
  if (!filteredSyllables.some(s => normalizeText(s) === selectedNormalized)) {
    console.error(`[BP] ERREUR: Syllabe "${selected}" n'est pas dans filteredSyllables!`);
    const fallback = filteredSyllables[0];
    if (!fallback) {
      throw new Error('[BP] ERREUR CRITIQUE: Impossible de selectionner une syllabe valide.');
    }
    const fallbackNormalized = normalizeText(fallback);
    recentSyllablesHistory.push(fallbackNormalized);
    if (recentSyllablesHistory.length > MAX_HISTORY_SIZE) {
      recentSyllablesHistory.shift();
    }
    return fallback.toUpperCase();
  }
  
  recentSyllablesHistory.push(selectedNormalized);
  if (recentSyllablesHistory.length > MAX_HISTORY_SIZE) {
    recentSyllablesHistory.shift();
  }
  
  return selected.toUpperCase();
}

export function getSyllableInfo(syllable: string): {
  syllable: string;
  availableWords: number;
  totalWords: number;
} {
  const normalizedSyllable = normalizeText(syllable);
  const words = fragmentIndex.get(normalizedSyllable) || new Set();
  return {
    syllable: syllable.toUpperCase(),
    availableWords: words.size,
    totalWords: words.size
  };
}

export function getSyllableDifficulty(syllable: string): 'easy' | 'medium' | 'hard' {
  const info = getSyllableInfo(syllable);
  const wordCount = info.availableWords;
  
  if (wordCount >= MIN_WORDS_REQUIRED) {
    return 'easy';
  } else if (wordCount >= 100) {
    return 'medium';
  } else {
    return 'hard';
  }
}

export function isValidSyllable(syllable: string): boolean {
  const normalized = normalizeText(syllable);
  return filteredSyllables.some(s => normalizeText(s) === normalized);
}

export function getAllSyllables(): string[] {
  return filteredSyllables.map(f => f.toUpperCase());
}

export async function getWordSuggestions(syllable: string, maxSuggestions: number = 5): Promise<string[]> {
  const normalizedSyllable = normalizeText(syllable);
  const words = fragmentIndex.get(normalizedSyllable) || new Set();
  if (words.size >= maxSuggestions) {
    return Array.from(words)
      .filter(w => w.length >= 3)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, maxSuggestions);
  }

  const dictManager = getDictionaryManager();
  await dictManager.initialize();
  return await dictManager.getWordSuggestions(syllable, maxSuggestions);
}

export function getWordSuggestionsSync(syllable: string, maxSuggestions: number = 5): string[] {
  const normalizedSyllable = normalizeText(syllable);
  const words = fragmentIndex.get(normalizedSyllable) || new Set();
  return Array.from(words)
    .filter(w => w.length >= 3 && isValidSyllableInWord(w, normalizedSyllable))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, maxSuggestions);
}

export async function wordExistsInDictionary(word: string): Promise<boolean> {
  const dictManager = getDictionaryManager();
  await dictManager.initialize();
  return await dictManager.wordExists(word);
}

export function wordExistsInDictionarySync(word: string): boolean {
  return frenchLexicon.has(normalizeText(word));
}

export function getFrenchLexicon(): Set<string> {
  return frenchLexicon;
}
