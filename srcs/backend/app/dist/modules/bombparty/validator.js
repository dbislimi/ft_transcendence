/**
 * Validator pour Bomb Party - Backend
 *
 * Port du validator frontend avec dictionnaire intégré
 */
import trigramWordsData from './data/trigram_words.json' with { type: 'json' };
const trigramMap = trigramWordsData;
function normalizeText(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
const englishLexicon = new Set(Object.values(trigramMap)
    .flat()
    .filter(Boolean)
    .map(w => normalizeText(w)));
/**
 * Valide un mot avec le dictionnaire intégré
 */
export function validateWithDictionary(word, trigram, usedWords) {
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
/**
 * Validation locale sans dictionnaire (pour tests rapides)
 */
export function validateLocal(word, trigram, usedWords) {
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
/**
 * Suggestions de mots pour un trigramme donné
 */
export function getWordSuggestions(trigram, maxSuggestions = 5) {
    const normalizedTrigram = normalizeText(trigram);
    const list = trigramMap[normalizedTrigram] || [];
    return list
        .filter((w) => typeof w === 'string' && w.length >= 3)
        .map(w => ({ original: w, normalized: normalizeText(w) }))
        .filter(item => item.normalized.includes(normalizedTrigram))
        .sort((a, b) => a.normalized.localeCompare(b.normalized))
        .slice(0, maxSuggestions)
        .map(item => item.original);
}
/**
 * Debug du dictionnaire
 */
export function debugDictionary() {
    const testTrigrams = ['the', 'ing', 'ion', 'est', 'tri'];
    testTrigrams.forEach(trigram => {
        const suggestions = getWordSuggestions(trigram, 3);
    });
}
/**
 * Normalise le texte pour le jeu
 */
export function normalizeTextForGame(text) {
    return normalizeText(text);
}
