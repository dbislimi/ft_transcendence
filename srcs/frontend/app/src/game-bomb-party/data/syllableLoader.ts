import syllablesData from './syllabes.json';

let availableSyllables: string[] = [];
let recentSyllablesHistory: string[] = [];
const MAX_HISTORY_SIZE = 15;

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function initializeSyllables(): void {
  if (Array.isArray(syllablesData)) {
    availableSyllables = syllablesData.map(s => normalizeText(s));
    console.log(`[BombParty Frontend] ${availableSyllables.length} syllabes chargées depuis syllabes.json`);
  } else {
    console.error('[BombParty Frontend] ERREUR: syllabes.json n\'est pas un tableau');
    availableSyllables = ['ab', 'ac', 'ad', 'ag', 'al', 'am', 'an', 'ap', 'ar', 'as', 'at', 'au', 'av', 'ba', 'be', 'bi', 'bo', 'br', 'ca', 'ce', 'ch', 'ci', 'co', 'cr', 'da', 'de', 'di', 'do', 'dr', 'ea', 'ec', 'ef', 'eg', 'el', 'em', 'en', 'ep', 'er', 'es', 'et', 'eu', 'ev', 'ex', 'fa', 'fe', 'fi', 'fl', 'fo', 'fr', 'ga', 'ge', 'gi', 'gl', 'go', 'gr', 'ha', 'he', 'hi', 'ho', 'hu', 'hy', 'ic', 'id', 'ie', 'if', 'ig', 'il', 'im', 'in', 'io', 'ip', 'ir', 'is', 'it', 'iv', 'ix', 'ja', 'je', 'jo', 'ju', 'la', 'le', 'li', 'lo', 'lu', 'ly', 'ma', 'me', 'mi', 'mo', 'mu', 'na', 'ne', 'ni', 'no', 'nu', 'oc', 'od', 'of', 'og', 'oi', 'ol', 'om', 'on', 'op', 'or', 'os', 'ot', 'ou', 'ov', 'ox', 'pa', 'pe', 'ph', 'pi', 'pl', 'po', 'pr', 'pu', 'qu', 'ra', 're', 'ri', 'ro', 'ru', 'sa', 'sc', 'se', 'sh', 'si', 'sl', 'sm', 'so', 'sp', 'sq', 'ss', 'st', 'su', 'sy', 'ta', 'te', 'th', 'ti', 'to', 'tr', 'tu', 'ty', 'ua', 'ub', 'uc', 'ud', 'ue', 'uf', 'ug', 'ui', 'ul', 'um', 'un', 'up', 'ur', 'us', 'ut', 'uv', 'ux', 'va', 've', 'vi', 'vo', 'vu', 'xa', 'xe', 'xi', 'xo', 'xy', 'ya', 'ye', 'yo', 'za', 'ze', 'zi', 'zo', 'zu'];
  }
}

export function getRandomSyllable(excludeSyllable?: string): string {
  if (availableSyllables.length === 0) {
    initializeSyllables();
  }

  if (availableSyllables.length === 0) {
    console.warn('[BombParty Frontend] Aucune syllabe disponible, utilisation d\'un fallback');
    return 'CH';
  }

  const normalizedExclude = excludeSyllable ? normalizeText(excludeSyllable) : undefined;
  
  const excludeSet = new Set<string>();
  if (normalizedExclude) {
    excludeSet.add(normalizedExclude);
  }
  recentSyllablesHistory.forEach(s => excludeSet.add(normalizeText(s)));
  
  let candidates = availableSyllables.filter(s => !excludeSet.has(s));
  
  if (candidates.length === 0) {
    console.log('[BombParty Frontend] Toutes les syllabes sont récentes, réduction de l\'historique...');
    recentSyllablesHistory.splice(0, Math.floor(MAX_HISTORY_SIZE / 2));
    excludeSet.clear();
    if (normalizedExclude) {
      excludeSet.add(normalizedExclude);
    }
    recentSyllablesHistory.forEach(s => excludeSet.add(normalizeText(s)));
    candidates = availableSyllables.filter(s => !excludeSet.has(s));
  }
  
  const pool = candidates.length > 0 ? candidates : availableSyllables;
  
  const selected = pool[Math.floor(Math.random() * pool.length)];
  const selectedNormalized = normalizeText(selected);
  
  recentSyllablesHistory.push(selectedNormalized);
  
  if (recentSyllablesHistory.length > MAX_HISTORY_SIZE) {
    recentSyllablesHistory.shift();
  }
  
  return selected.toUpperCase();
}

initializeSyllables();

