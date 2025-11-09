// Import du fichier JSON des syllabes
// Vite gère les imports JSON automatiquement
import syllablesData from './syllabes.json';

// Charge les syllabes depuis le fichier JSON
let availableSyllables: string[] = [];
let recentSyllablesHistory: string[] = [];
const MAX_HISTORY_SIZE = 15;

// Normalise le texte (enlève les accents, met en minuscule)
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Initialise les syllabes disponibles
export function initializeSyllables(): void {
  if (Array.isArray(syllablesData)) {
    availableSyllables = syllablesData.map(s => normalizeText(s));
    console.log(`[BombParty Frontend] ${availableSyllables.length} syllabes chargées depuis syllabes.json`);
  } else {
    console.error('[BombParty Frontend] ERREUR: syllabes.json n\'est pas un tableau');
    // Fallback avec quelques syllabes de base
    availableSyllables = ['ab', 'ac', 'ad', 'ag', 'al', 'am', 'an', 'ap', 'ar', 'as', 'at', 'au', 'av', 'ba', 'be', 'bi', 'bo', 'br', 'ca', 'ce', 'ch', 'ci', 'co', 'cr', 'da', 'de', 'di', 'do', 'dr', 'ea', 'ec', 'ef', 'eg', 'el', 'em', 'en', 'ep', 'er', 'es', 'et', 'eu', 'ev', 'ex', 'fa', 'fe', 'fi', 'fl', 'fo', 'fr', 'ga', 'ge', 'gi', 'gl', 'go', 'gr', 'ha', 'he', 'hi', 'ho', 'hu', 'hy', 'ic', 'id', 'ie', 'if', 'ig', 'il', 'im', 'in', 'io', 'ip', 'ir', 'is', 'it', 'iv', 'ix', 'ja', 'je', 'jo', 'ju', 'la', 'le', 'li', 'lo', 'lu', 'ly', 'ma', 'me', 'mi', 'mo', 'mu', 'na', 'ne', 'ni', 'no', 'nu', 'oc', 'od', 'of', 'og', 'oi', 'ol', 'om', 'on', 'op', 'or', 'os', 'ot', 'ou', 'ov', 'ox', 'pa', 'pe', 'ph', 'pi', 'pl', 'po', 'pr', 'pu', 'qu', 'ra', 're', 'ri', 'ro', 'ru', 'sa', 'sc', 'se', 'sh', 'si', 'sl', 'sm', 'so', 'sp', 'sq', 'ss', 'st', 'su', 'sy', 'ta', 'te', 'th', 'ti', 'to', 'tr', 'tu', 'ty', 'ua', 'ub', 'uc', 'ud', 'ue', 'uf', 'ug', 'ui', 'ul', 'um', 'un', 'up', 'ur', 'us', 'ut', 'uv', 'ux', 'va', 've', 'vi', 'vo', 'vu', 'xa', 'xe', 'xi', 'xo', 'xy', 'ya', 'ye', 'yo', 'za', 'ze', 'zi', 'zo', 'zu'];
  }
}

// Obtient une syllabe aléatoire depuis le fichier syllabes.json
// Évite les répétitions récentes pour plus de variété
export function getRandomSyllable(excludeSyllable?: string): string {
  if (availableSyllables.length === 0) {
    initializeSyllables();
  }

  if (availableSyllables.length === 0) {
    console.warn('[BombParty Frontend] Aucune syllabe disponible, utilisation d\'un fallback');
    return 'CH';
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
  let candidates = availableSyllables.filter(s => !excludeSet.has(s));
  
  // Si tous les candidats sont exclus, on réduit l'historique et on réessaie
  if (candidates.length === 0) {
    console.log('[BombParty Frontend] Toutes les syllabes sont récentes, réduction de l\'historique...');
    // Réduit l'historique à la moitié
    recentSyllablesHistory.splice(0, Math.floor(MAX_HISTORY_SIZE / 2));
    excludeSet.clear();
    if (normalizedExclude) {
      excludeSet.add(normalizedExclude);
    }
    recentSyllablesHistory.forEach(s => excludeSet.add(normalizeText(s)));
    candidates = availableSyllables.filter(s => !excludeSet.has(s));
  }
  
  // Si toujours aucun candidat, on prend parmi tous (cas extrême)
  const pool = candidates.length > 0 ? candidates : availableSyllables;
  
  // Sélectionne une syllabe aléatoire
  const selected = pool[Math.floor(Math.random() * pool.length)];
  const selectedNormalized = normalizeText(selected);
  
  // Ajoute la syllabe sélectionnée à l'historique
  recentSyllablesHistory.push(selectedNormalized);
  
  // Limite la taille de l'historique
  if (recentSyllablesHistory.length > MAX_HISTORY_SIZE) {
    recentSyllablesHistory.shift(); // Retire la plus ancienne
  }
  
  return selected.toUpperCase();
}

// Initialise au chargement du module
initializeSyllables();

