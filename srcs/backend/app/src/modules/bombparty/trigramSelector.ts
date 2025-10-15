
import trigramWordsData from './data/trigram_words.json' with { type: 'json' };

const trigramMap = trigramWordsData as Record<string, string[]>;
const availableTrigrams = Object.keys(trigramMap);

export function getRandomTrigram(excludeTrigram?: string): string {
  if (availableTrigrams.length === 0) {
    console.warn('[BombParty] Aucun trigramme disponible');
    return 'the';
  }

  const candidates = excludeTrigram 
    ? availableTrigrams.filter(t => t !== excludeTrigram)
    : availableTrigrams;
  
  const pool = candidates.length > 0 ? candidates : availableTrigrams;
  
  const selected = pool[Math.floor(Math.random() * pool.length)];
  
  
  return selected;
}

export function getTrigramInfo(trigram: string): {
  trigram: string;
  availableWords: number;
  totalWords: number;
} {
  const words = trigramMap[trigram] || [];
  return {
    trigram,
    availableWords: words.length,
    totalWords: words.length
  };
}

export function isValidTrigram(trigram: string): boolean {
  return trigram in trigramMap;
}

export function getAllTrigrams(): string[] {
  return [...availableTrigrams];
}
