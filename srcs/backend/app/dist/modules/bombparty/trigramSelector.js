/**
 * Sélecteur de trigrammes pour Bomb Party
 *
 * Gère la sélection aléatoire de trigrammes depuis le dictionnaire
 */
import trigramWordsData from './data/trigram_words.json' with { type: 'json' };
const trigramMap = trigramWordsData;
const availableTrigrams = Object.keys(trigramMap);
/**
 * Sélectionne un trigramme aléatoire, en évitant le précédent si possible
 */
export function getRandomTrigram(excludeTrigram) {
    if (availableTrigrams.length === 0) {
        console.warn('⚠️ [BombParty] Aucun trigramme disponible');
        return 'the'; // fallback
    }
    // Filtrer le trigramme précédent si fourni
    const candidates = excludeTrigram
        ? availableTrigrams.filter(t => t !== excludeTrigram)
        : availableTrigrams;
    // Si on a filtré tous les trigrammes, utiliser la liste complète
    const pool = candidates.length > 0 ? candidates : availableTrigrams;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    console.log('🎲 [BombParty] Trigramme sélectionné:', {
        trigram: selected,
        excluded: excludeTrigram,
        poolSize: pool.length
    });
    return selected;
}
/**
 * Obtient des informations sur un trigramme
 */
export function getTrigramInfo(trigram) {
    const words = trigramMap[trigram] || [];
    return {
        trigram,
        availableWords: words.length,
        totalWords: words.length
    };
}
/**
 * Vérifie si un trigramme existe dans le dictionnaire
 */
export function isValidTrigram(trigram) {
    return trigram in trigramMap;
}
/**
 * Obtient tous les trigrammes disponibles
 */
export function getAllTrigrams() {
    return [...availableTrigrams];
}
