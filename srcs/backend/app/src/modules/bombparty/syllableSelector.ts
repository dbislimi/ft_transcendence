import fs from 'fs';
import { normalizeText, isValidSyllableInWord } from './syllableExtractor.ts';
import { getDictionaryManager } from './dictionaryManager.ts';

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
  throw new Error(`[BombParty] ERREUR CRITIQUE: Le fichier syllabes.txt est introuvable à ${syllablesPath.pathname}. Veuillez exécuter generateSyllables.ts pour le créer.`);
}

const syllablesData = fs.readFileSync(syllablesPath, 'utf8');
const availableFragments: string[] = syllablesData
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0)
  .map(syllable => normalizeText(syllable));

if (availableFragments.length === 0) {
  throw new Error('[BombParty] ERREUR CRITIQUE: Le fichier syllabes.txt est vide. Veuillez exécuter generateSyllables.ts pour le régénérer.');
}

console.log(`[BombParty] ✓ ${availableFragments.length} syllabes valides chargées depuis syllabes.txt`);
console.log(`[BombParty] Exemples de syllabes: ${availableFragments.slice(0, 5).join(', ')}...`);

const fragmentIndex: Map<string, Set<string>> = new Map();
const validSyllablesSet = new Set(availableFragments);

console.log('[BombParty] Initialisation de l\'index des fragments pour les syllabes valides...');
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
      console.log(`[BombParty] Traité ${wordCount} mots...`);
    }
  }
}

console.log(`[BombParty] Index des fragments initialisé pour ${fragmentIndex.size} syllabes valides`);

const recentSyllablesHistory: string[] = [];
const MAX_HISTORY_SIZE = 15;

export function getRandomSyllable(excludeSyllable?: string): string {
  if (availableFragments.length === 0) {
    throw new Error('[BombParty] ERREUR: Aucune syllabe disponible. Le fichier syllabes.txt est vide.');
  }

  const normalizedExclude = excludeSyllable ? normalizeText(excludeSyllable) : undefined;
  
  const excludeSet = new Set<string>();
  if (normalizedExclude) {
    excludeSet.add(normalizedExclude);
  }
  recentSyllablesHistory.forEach(s => excludeSet.add(normalizeText(s)));
  
  let candidates = availableFragments.filter(s => !excludeSet.has(s));
  
  if (candidates.length === 0) {
    console.log('[BombParty] Toutes les syllabes sont récentes, réduction de l\'historique...');
    recentSyllablesHistory.splice(0, Math.floor(MAX_HISTORY_SIZE / 2));
    excludeSet.clear();
    if (normalizedExclude) {
      excludeSet.add(normalizedExclude);
    }
    recentSyllablesHistory.forEach(s => excludeSet.add(normalizeText(s)));
    candidates = availableFragments.filter(s => !excludeSet.has(s));
  }
  
  const pool = candidates.length > 0 ? candidates : availableFragments;
  
  const easySyllables = pool.filter(s => {
    const words = fragmentIndex.get(normalizeText(s));
    return words && words.size >= 100;
  });
  
  if (easySyllables.length > 0) {
    const selected = easySyllables[Math.floor(Math.random() * easySyllables.length)];
    const selectedNormalized = normalizeText(selected);
    
    recentSyllablesHistory.push(selectedNormalized);
    if (recentSyllablesHistory.length > MAX_HISTORY_SIZE) {
      recentSyllablesHistory.shift();
    }
    
    return selected.toUpperCase();
  }
  
  const mediumSyllables = pool.filter(s => {
    const words = fragmentIndex.get(normalizeText(s));
    return words && words.size >= 50 && words.size < 100;
  });
  
  if (mediumSyllables.length > 0) {
    const selected = mediumSyllables[Math.floor(Math.random() * mediumSyllables.length)];
    const selectedNormalized = normalizeText(selected);
    
    recentSyllablesHistory.push(selectedNormalized);
    if (recentSyllablesHistory.length > MAX_HISTORY_SIZE) {
      recentSyllablesHistory.shift();
    }
    
    return selected.toUpperCase();
  }
  
  const selected = pool[Math.floor(Math.random() * pool.length)];
  const selectedNormalized = normalizeText(selected);
  
  if (!availableFragments.includes(selectedNormalized)) {
    console.error(`[BombParty] ERREUR: Syllabe "${selected}" n'est pas dans availableFragments!`);
    const fallback = availableFragments[0];
    if (!fallback) {
      throw new Error('[BombParty] ERREUR CRITIQUE: Impossible de sélectionner une syllabe valide.');
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
  
  if (wordCount >= 100) {
    return 'easy';
  } else if (wordCount >= 50) {
    return 'medium';
  } else {
    return 'hard';
  }
}

export function isValidSyllable(syllable: string): boolean {
  return availableFragments.includes(normalizeText(syllable));
}

export function getAllSyllables(): string[] {
  return availableFragments.map(f => f.toUpperCase());
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
