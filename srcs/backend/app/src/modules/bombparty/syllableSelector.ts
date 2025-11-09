import fs from 'fs';
import { normalizeText } from './syllableExtractor.ts';
import { getDictionaryManager } from './dictionaryManager.ts';

// Charge le fichier de mots francais pour l'index des fragments
// Le dictionnaire complet est géré par DictionaryManager avec lazy loading
const francaisWordsPath = new URL('./data/francais.txt', import.meta.url);
const francaisWordsData = fs.readFileSync(francaisWordsPath, 'utf8');

// Crée un Set de tous les mots normalisés pour l'index des fragments
// Note: Pour la validation, on utilise DictionaryManager qui charge les partitions à la demande
const frenchLexicon: Set<string> = new Set(
  francaisWordsData
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(word => normalizeText(word))
);

// charge le fichier de syllabes valides
// IMPORTANT: Ce fichier doit exister, pas de fallback pour garantir l'utilisation des syllabes filtrées
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

// cree un index des fragments : fragment -> mots qui le contiennent
// (uniquement pour les syllabes valides, pour optimiser)
const fragmentIndex: Map<string, Set<string>> = new Map();

// initialise l'index des fragments seulement pour les syllabes valides
// Crée un Set pour une recherche rapide
const validSyllablesSet = new Set(availableFragments);

console.log('[BombParty] Initialisation de l\'index des fragments pour les syllabes valides...');
let wordCount = 0;
for (const word of frenchLexicon) {
  if (word.length >= 3) {
    const normalized = normalizeText(word);
    // Extrait tous les fragments possibles du mot et vérifie s'ils sont dans les syllabes valides
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

// Historique des syllabes récentes pour éviter les répétitions
const recentSyllablesHistory: string[] = [];
const MAX_HISTORY_SIZE = 15; // Nombre de syllabes récentes à éviter

// obtient un fragment aleatoire (syllabe/fragment de mot)
// Évite les répétitions récentes pour plus de variété
// GARANTIT que seule une syllabe du fichier syllabes.txt est retournée
export function getRandomSyllable(excludeSyllable?: string): string {
  if (availableFragments.length === 0) {
    throw new Error('[BombParty] ERREUR: Aucune syllabe disponible. Le fichier syllabes.txt est vide.');
  }

  const normalizedExclude = excludeSyllable ? normalizeText(excludeSyllable) : undefined;
  
  // Crée un Set des syllabes à éviter (dernière syllabe + historique récent)
  const excludeSet = new Set<string>();
  if (normalizedExclude) {
    excludeSet.add(normalizedExclude);
  }
  // Ajoute les syllabes récentes à éviter
  recentSyllablesHistory.forEach(s => excludeSet.add(normalizeText(s)));
  
  // Filtre les candidats en excluant les syllabes récentes
  // IMPORTANT: On filtre uniquement dans availableFragments (qui vient de syllabes.txt)
  let candidates = availableFragments.filter(s => !excludeSet.has(s));
  
  // Si tous les candidats sont exclus, on réduit l'historique et on réessaie
  if (candidates.length === 0) {
    console.log('[BombParty] Toutes les syllabes sont récentes, réduction de l\'historique...');
    // Réduit l'historique à la moitié
    recentSyllablesHistory.splice(0, Math.floor(MAX_HISTORY_SIZE / 2));
    excludeSet.clear();
    if (normalizedExclude) {
      excludeSet.add(normalizedExclude);
    }
    recentSyllablesHistory.forEach(s => excludeSet.add(normalizeText(s)));
    candidates = availableFragments.filter(s => !excludeSet.has(s));
  }
  
  // Si toujours aucun candidat, on prend parmi tous (cas extrême)
  // MAIS toujours depuis availableFragments (syllabes.txt)
  const pool = candidates.length > 0 ? candidates : availableFragments;
  
  // Sélectionne une syllabe aléatoire depuis le pool (qui vient uniquement de syllabes.txt)
  const selected = pool[Math.floor(Math.random() * pool.length)];
  const selectedNormalized = normalizeText(selected);
  
  // Vérification de sécurité: s'assurer que la syllabe sélectionnée est bien dans availableFragments
  if (!availableFragments.includes(selectedNormalized)) {
    console.error(`[BombParty] ERREUR: Syllabe "${selected}" n'est pas dans availableFragments!`);
    // En cas d'erreur, prendre la première syllabe disponible
    const fallback = availableFragments[0];
    if (!fallback) {
      throw new Error('[BombParty] ERREUR CRITIQUE: Impossible de sélectionner une syllabe valide.');
    }
    return fallback.toUpperCase();
  }
  
  // Ajoute la syllabe sélectionnée à l'historique
  recentSyllablesHistory.push(selectedNormalized);
  
  // Limite la taille de l'historique
  if (recentSyllablesHistory.length > MAX_HISTORY_SIZE) {
    recentSyllablesHistory.shift(); // Retire la plus ancienne
  }
  
  return selected.toUpperCase();
}

// obtient les informations sur un fragment
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

// verifie si un fragment est valide
export function isValidSyllable(syllable: string): boolean {
  return availableFragments.includes(normalizeText(syllable));
}

// obtient tous les fragments disponibles
export function getAllSyllables(): string[] {
  return availableFragments.map(f => f.toUpperCase());
}

// obtient des suggestions de mots pour un fragment
export async function getWordSuggestions(syllable: string, maxSuggestions: number = 5): Promise<string[]> {
  // Essaie d'abord l'index en mémoire (rapide)
  const normalizedSyllable = normalizeText(syllable);
  const words = fragmentIndex.get(normalizedSyllable) || new Set();
  if (words.size >= maxSuggestions) {
    return Array.from(words)
      .filter(w => w.length >= 3)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, maxSuggestions);
  }

  // Sinon, utilise le DictionaryManager pour une recherche plus complète
  const dictManager = getDictionaryManager();
  await dictManager.initialize();
  return await dictManager.getWordSuggestions(syllable, maxSuggestions);
}

// Version synchrone pour compatibilité (utilise uniquement l'index en mémoire)
export function getWordSuggestionsSync(syllable: string, maxSuggestions: number = 5): string[] {
  const normalizedSyllable = normalizeText(syllable);
  const words = fragmentIndex.get(normalizedSyllable) || new Set();
  return Array.from(words)
    .filter(w => w.length >= 3)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, maxSuggestions);
}

// verifie si un mot existe dans le dictionnaire francais
// Utilise le DictionaryManager avec lazy loading pour de meilleures performances
export async function wordExistsInDictionary(word: string): Promise<boolean> {
  const dictManager = getDictionaryManager();
  await dictManager.initialize();
  return await dictManager.wordExists(word);
}

// Version synchrone pour compatibilité (utilise le Set en mémoire)
// À utiliser uniquement pour des validations rapides, pas pour la validation finale
export function wordExistsInDictionarySync(word: string): boolean {
  return frenchLexicon.has(normalizeText(word));
}

// obtient le dictionnaire francais complet
export function getFrenchLexicon(): Set<string> {
  return frenchLexicon;
}
