import fs from 'fs';
import { normalizeText, getAllSyllablesFromWord } from './syllableExtractor.ts';

const MIN_WORDS_REQUIRED = 800;

const francaisWordsPath = new URL('./data/francais.txt', import.meta.url);
const syllablesPath = new URL('./data/syllabes.txt', import.meta.url);

console.log('[BP] Génération des syllabes avec >=', MIN_WORDS_REQUIRED, 'mots...');

const francaisWordsData = fs.readFileSync(francaisWordsPath, 'utf8');
const words = francaisWordsData
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0)
  .map(word => normalizeText(word))
  .filter(word => word.length >= 3);

console.log(`[BP] ${words.length} mots chargés depuis francais.txt`);
const syllableCount = new Map<string, number>();

let processedWords = 0;
for (const word of words) {
  const syllables = getAllSyllablesFromWord(word);
  for (const syllable of syllables) {
    const normalized = normalizeText(syllable);
    if (normalized.length >= 2 && normalized.length <= 6) {
      syllableCount.set(normalized, (syllableCount.get(normalized) || 0) + 1);
    }
  }
  processedWords++;
  if (processedWords % 1000 === 0) {
    console.log(`[BP] Traité ${processedWords}/${words.length} mots...`);
  }
}

console.log(`[BP] ${syllableCount.size} syllabes uniques extraites`);
const validSyllables: string[] = [];
for (const [syllable, count] of syllableCount.entries()) {
  if (count >= MIN_WORDS_REQUIRED) {
    validSyllables.push(syllable);
  }
}
validSyllables.sort();

console.log(`[BP] ✓ ${validSyllables.length} syllabes avec >= ${MIN_WORDS_REQUIRED} mots disponibles`);
const output = validSyllables.join('\n');
fs.writeFileSync(syllablesPath, output, 'utf8');

console.log(`[BP] ✓ Fichier syllabes.txt généré avec succès !`);
console.log(`[BP] Exemples de syllabes: ${validSyllables.slice(0, 10).join(', ')}...`);

