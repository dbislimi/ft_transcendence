const VOYELLES = 'aeiouyàâäéèêëïîôöùûüÿ';
const CONSONNES = 'bcdfghjklmnpqrstvwxz';

function isVoyelle(char: string): boolean {
  return VOYELLES.includes(char.toLowerCase());
}

function isConsonne(char: string): boolean {
  return CONSONNES.includes(char.toLowerCase());
}

export function extractSyllables(word: string): string[] {
  const normalized = word.toLowerCase().trim();
  if (normalized.length === 0) return [];
  
  const syllables: string[] = [];
  let i = 0;
  
  while (i < normalized.length) {
    let syllable = '';
    
    while (i < normalized.length && isConsonne(normalized[i])) {
      syllable += normalized[i];
      i++;
    }
    
    if (i < normalized.length && isVoyelle(normalized[i])) {
      syllable += normalized[i];
      i++;
      
      while (i < normalized.length && isVoyelle(normalized[i])) {
        syllable += normalized[i];
        i++;
      }
    }
    
    if (i < normalized.length && isConsonne(normalized[i])) {
      const nextAfterConsonne = normalized[i + 1];
      if (nextAfterConsonne && isVoyelle(nextAfterConsonne)) {
      } else {
        syllable += normalized[i];
        i++;
        if (i < normalized.length && isConsonne(normalized[i]) && 
            !(normalized[i + 1] && isVoyelle(normalized[i + 1]))) {
          syllable += normalized[i];
          i++;
        }
      }
    }
    
    if (syllable.length > 0 && syllable.split('').some(c => isVoyelle(c))) {
      syllables.push(syllable);
    }
  }
  
  if (syllables.length === 0 && normalized.length > 0) {
    return [normalized];
  }
  
  return syllables.filter(s => s.length > 0);
}

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getAllSyllablesFromWord(word: string): string[] {
  const normalized = normalizeText(word);
  const syllables = extractSyllables(normalized);
  const allSyllables = new Set<string>();
  
  syllables.forEach(s => {
    if (s.length >= 2) {
      allSyllables.add(s);
    }
  });
  
  for (let i = 0; i < normalized.length - 1; i++) {
    for (let j = i + 2; j <= normalized.length; j++) {
      const sub = normalized.substring(i, j);
      if (sub.split('').some(c => isVoyelle(c))) {
        allSyllables.add(sub);
      }
    }
  }
  
  return Array.from(allSyllables).filter(s => s.length >= 2 && s.length <= 6);
}

export function isValidSyllableInWord(word: string, syllable: string): boolean {
  const normalizedWord = normalizeText(word);
  const normalizedSyllable = normalizeText(syllable);
  
  if (!normalizedWord.includes(normalizedSyllable)) {
    return false;
  }
  
  // mots composes avec tirets
  if (normalizedWord.includes('-')) {
    const parts = normalizedWord.split('-');
    for (const part of parts) {
      if (isValidSyllableInWord(part, normalizedSyllable)) {
        return true;
      }
    }
    return false;
  }
  
  const syllables = extractSyllables(normalizedWord);
  
  let currentPos = 0;
  for (const extractedSyllable of syllables) {
    const syllableStart = currentPos;
    const syllableEnd = currentPos + extractedSyllable.length;
    
    const wordSubstring = normalizedWord.substring(syllableStart, syllableEnd);
    if (wordSubstring.startsWith(normalizedSyllable)) {
      return true;
    }
    
    currentPos = syllableEnd;
  }
  
  return false;
}

