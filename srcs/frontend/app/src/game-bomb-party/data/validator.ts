import type { ValidationResult } from '../core/types';

// Import statique du dictionnaire français
import frenchWordsData from './french-words.json';
// Import des trigrammes avec leurs mots associés
import trigramWordsData from './trigram_words.json';

// Créer un Set pour une recherche rapide O(1)
const frenchDictionary = new Set(frenchWordsData as string[]);

console.log('📚 Dictionnaire français chargé:', frenchDictionary.size, 'mots');
console.log('🔤 Trigrammes avec mots associés chargés:', Object.keys(trigramWordsData).length, 'trigrammes');

// Fonction de débogage pour tester le dictionnaire
export function debugDictionary() {
  console.log('🔍 === DÉBOGAGE DU DICTIONNAIRE ===');
  console.log('📚 Taille du dictionnaire:', frenchDictionary.size);
  console.log('�� Taille de l\'index des trigrammes:', Object.keys(trigramWordsData).length);
  
  // Vérifier quelques mots de test
  const testWords = ['chat', 'maison', 'voiture', 'bonjour', 'merci'];
  testWords.forEach(word => {
    const exists = frenchDictionary.has(word);
    console.log(`🔍 "${word}" dans le dictionnaire:`, exists);
  });
  
  // Vérifier quelques trigrammes
  const testTrigrams = ['cha', 'mai', 'voi', 'bon', 'mer'];
  testTrigrams.forEach(trigram => {
    const suggestions = getWordSuggestions(trigram, 3);
    console.log(`🔤 Suggestions pour "${trigram}":`, suggestions);
  });
  
  console.log('🔍 === FIN DU DÉBOGAGE ===');
}

// Fonction de normalisation pour supprimer les accents
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques
    .toLowerCase();
}

// Validation avec dictionnaire français et normalisation
export function validateWithDictionary(word: string, trigram: string, usedWords: string[]): ValidationResult {
  console.log('🔍 Validation du mot:', word, 'pour le trigramme:', trigram);
  console.log('📚 Taille du dictionnaire français:', frenchDictionary.size);
  
  // Normaliser le mot et le trigramme
  const normalizedWord = normalizeText(word);
  const normalizedTrigram = normalizeText(trigram);
  
  console.log('🔤 Mot normalisé:', normalizedWord, 'Trigramme normalisé:', normalizedTrigram);
  
  // Vérification de la longueur minimale
  if (word.length < 3) {
    console.log('❌ Mot trop court:', word);
    return { ok: false, reason: 'too_short' };
  }

  // Vérification que le mot contient le trigramme (avec normalisation)
  if (!normalizedWord.includes(normalizedTrigram)) {
    console.log('❌ Mot ne contient pas le trigramme normalisé:', normalizedWord, 'trigramme:', normalizedTrigram);
    return { ok: false, reason: 'no_trigram' };
  }

  // Vérification que le mot n'a pas déjà été utilisé (avec normalisation)
  const normalizedUsedWords = usedWords.map(used => normalizeText(used));
  if (normalizedUsedWords.includes(normalizedWord)) {
    console.log('❌ Mot déjà utilisé (normalisé):', normalizedWord);
    return { ok: false, reason: 'duplicate' };
  }

  // Vérification des caractères autorisés (lettres, accents, tirets)
  const validCharsRegex = /^[a-zA-ZÀ-ÿ\-]+$/;
  if (!validCharsRegex.test(word)) {
    console.log('❌ Caractères invalides dans:', word);
    return { ok: false, reason: 'invalid_chars' };
  }

  // Vérification contre le dictionnaire français (avec normalisation)
  console.log('🔍 Recherche du mot normalisé dans le dictionnaire:', normalizedWord);
  
  // Créer un dictionnaire normalisé pour la recherche
  const normalizedDictionary = new Map<string, string>();
  Array.from(frenchDictionary).forEach(dictWord => {
    const normalized = normalizeText(dictWord);
    normalizedDictionary.set(normalized, dictWord);
  });
  
  if (!normalizedDictionary.has(normalizedWord)) {
    console.log('❌ Mot normalisé non trouvé dans le dictionnaire:', normalizedWord);
    console.log('🔍 Exemple de mots normalisés dans le dictionnaire:', Array.from(normalizedDictionary.keys()).slice(0, 10));
    
    // Vérifier si le mot existe avec une recherche partielle normalisée
    const similarWords = Array.from(normalizedDictionary.keys()).filter(dictWord => 
      dictWord.includes(normalizedWord) || normalizedWord.includes(dictWord)
    ).slice(0, 5);
    console.log('🔍 Mots similaires normalisés trouvés:', similarWords);
    
    return { ok: false, reason: 'invalid_chars' }; // Utiliser un type d'erreur valide
  }

  console.log('✅ Mot validé avec succès (normalisé):', normalizedWord);
  return { ok: true };
}

// Validation locale avec normalisation (fallback)
export function validateLocal(word: string, trigram: string, usedWords: string[]): ValidationResult {
  // Normaliser le mot et le trigramme
  const normalizedWord = normalizeText(word);
  const normalizedTrigram = normalizeText(trigram);
  
  // Vérification de la longueur minimale
  if (word.length < 3) {
    return { ok: false, reason: 'too_short' };
  }

  // Vérification que le mot contient le trigramme (avec normalisation)
  if (!normalizedWord.includes(normalizedTrigram)) {
    return { ok: false, reason: 'no_trigram' };
  }

  // Vérification que le mot n'a pas déjà été utilisé (avec normalisation)
  const normalizedUsedWords = usedWords.map(used => normalizeText(used));
  if (normalizedUsedWords.includes(normalizedWord)) {
    return { ok: false, reason: 'duplicate' };
  }

  // Vérification des caractères autorisés (lettres, accents, tirets)
  const validCharsRegex = /^[a-zA-ZÀ-ÿ\-]+$/;
  if (!validCharsRegex.test(word)) {
    return { ok: false, reason: 'invalid_chars' };
  }

  return { ok: true };
}

// Fonction pour obtenir des suggestions de mots avec normalisation
export function getWordSuggestions(trigram: string, maxSuggestions: number = 5): string[] {
  const normalizedTrigram = normalizeText(trigram);
  const suggestions = (trigramWordsData as Record<string, string[]>)[normalizedTrigram] || [];
  
  // Filtrer et normaliser les suggestions
  return suggestions
    .filter((word: string) => word.length >= 3)
    .map(word => ({
      original: word,
      normalized: normalizeText(word)
    }))
    .sort((a, b) => a.normalized.localeCompare(b.normalized))
    .slice(0, maxSuggestions)
    .map(item => item.original);
}

// Fonction utilitaire pour normaliser un texte (exportée pour usage externe)
export function normalizeTextForGame(text: string): string {
  return normalizeText(text);
}