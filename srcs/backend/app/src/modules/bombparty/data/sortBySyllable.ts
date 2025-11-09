import fs from 'fs';

// Fonctions simplifiées pour éviter les problèmes d'import
const VOYELLES = 'aeiouyàâäéèêëïîôöùûüÿ';
const CONSONNES = 'bcdfghjklmnpqrstvwxz';

function isVoyelle(char: string): boolean {
  return VOYELLES.includes(char.toLowerCase());
}

function isConsonne(char: string): boolean {
  return CONSONNES.includes(char.toLowerCase());
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Version optimisée et sécurisée d'extraction de la première syllabe
function getFirstSyllable(word: string): string {
  const normalized = normalizeText(word);
  if (normalized.length === 0) return '';
  
  let i = 0;
  let syllable = '';
  let hasVoyelle = false;
  const maxIterations = normalized.length * 2; // Protection contre boucle infinie
  let iterations = 0;
  
  // Commencer par les consonnes (optionnelles)
  while (i < normalized.length && isConsonne(normalized[i]) && iterations < maxIterations) {
    syllable += normalized[i];
    i++;
    iterations++;
  }
  
  // Ajouter la voyelle (obligatoire)
  if (i < normalized.length && isVoyelle(normalized[i])) {
    syllable += normalized[i];
    hasVoyelle = true;
    i++;
    
    // Ajouter les voyelles consécutives
    while (i < normalized.length && isVoyelle(normalized[i]) && iterations < maxIterations) {
      syllable += normalized[i];
      i++;
      iterations++;
    }
  }
  
  // Ajouter une consonne finale si elle existe et qu'on a une voyelle
  if (hasVoyelle && i < normalized.length && isConsonne(normalized[i])) {
    const nextAfterConsonne = normalized[i + 1];
    if (!nextAfterConsonne || !isVoyelle(nextAfterConsonne)) {
      syllable += normalized[i];
      i++;
    }
  }
  
  // Si aucune syllabe valide n'a été trouvée, retourner les 2-3 premiers caractères
  if (!hasVoyelle || syllable.length === 0) {
    return normalized.substring(0, Math.min(3, normalized.length));
  }
  
  return syllable;
}

const francaisWordsPath = new URL('./francais.txt', import.meta.url);
console.log('Lecture du fichier...');
const francaisWordsData = fs.readFileSync(francaisWordsPath, 'utf8');

// Lit tous les mots
const words = francaisWordsData
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0);

console.log(`✓ ${words.length} mots lus`);

// Extrait la première syllabe de chaque mot avec progression
console.log('Extraction des premières syllabes...');
const wordsWithSyllables: Array<{ word: string; firstSyllable: string }> = [];
const startTime = Date.now();

for (let i = 0; i < words.length; i++) {
  const word = words[i];
  try {
    const firstSyllable = getFirstSyllable(word);
    wordsWithSyllables.push({ word, firstSyllable });
  } catch (error) {
    console.error(`Erreur sur le mot ${i + 1} "${word}":`, error);
    // En cas d'erreur, utiliser les premiers caractères comme syllabe
    wordsWithSyllables.push({ word, firstSyllable: normalizeText(word).substring(0, 3) });
  }
  
  if ((i + 1) % 5000 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  Traité ${i + 1}/${words.length} mots (${elapsed}s)`);
  }
}

const extractionTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`✓ Extraction terminée en ${extractionTime}s`);

console.log('Tri des mots par syllabe...');
const sortStartTime = Date.now();

// Trie par première syllabe (ordre alphabétique)
wordsWithSyllables.sort((a, b) => {
  const syllableCompare = a.firstSyllable.localeCompare(b.firstSyllable, 'fr');
  if (syllableCompare !== 0) {
    return syllableCompare;
  }
  // Si les syllabes sont identiques, trie par mot
  return a.word.localeCompare(b.word, 'fr');
});

const sortTime = ((Date.now() - sortStartTime) / 1000).toFixed(1);
console.log(`✓ Tri terminé en ${sortTime}s`);

console.log('Écriture du fichier trié...');
const writeStartTime = Date.now();

// Écrit le fichier trié
const sortedWords = wordsWithSyllables.map(item => item.word).join('\n');
fs.writeFileSync(francaisWordsPath, sortedWords, 'utf8');

const writeTime = ((Date.now() - writeStartTime) / 1000).toFixed(1);
const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`✓ Fichier trié et sauvegardé en ${writeTime}s`);
console.log(`✓ Temps total: ${totalTime}s`);
console.log(`Première syllabe: "${wordsWithSyllables[0]?.firstSyllable}" (mot: ${wordsWithSyllables[0]?.word})`);
console.log(`Dernière syllabe: "${wordsWithSyllables[wordsWithSyllables.length - 1]?.firstSyllable}" (mot: ${wordsWithSyllables[wordsWithSyllables.length - 1]?.word})`);
