import fs from 'fs';

// Fonctions simplifiées intégrées pour éviter les imports lents
const VOYELLES = 'aeiouyàâäéèêëïîôöùûüÿ';

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function hasVoyelle(str: string): boolean {
  return str.split('').some(c => VOYELLES.includes(c.toLowerCase()));
}

const francaisWordsPath = new URL('./francais.txt', import.meta.url);
const syllablesPath = new URL('./syllabes.txt', import.meta.url);

console.log('Lecture du fichier francais.txt...');
const francaisWordsData = fs.readFileSync(francaisWordsPath, 'utf8');

// Crée un Set de tous les mots normalisés
const frenchLexicon: Set<string> = new Set(
  francaisWordsData
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(word => normalizeText(word))
);

console.log(`✓ ${frenchLexicon.size} mots chargés`);

// Index des fragments : fragment -> Set de mots qui le contiennent
const fragmentIndex: Map<string, Set<string>> = new Map();

console.log('Extraction des fragments de chaque mot...');
const words = Array.from(frenchLexicon);
let processedCount = 0;
const startTime = Date.now();

for (const word of words) {
  if (word.length < 3) continue;
  
  // Extrait tous les fragments de 2 à 4 caractères qui contiennent au moins une voyelle
  for (let len = 2; len <= Math.min(4, word.length); len++) {
    for (let i = 0; i <= word.length - len; i++) {
      const fragment = word.substring(i, i + len);
      
      // Vérifie que le fragment contient au moins une voyelle
      if (!hasVoyelle(fragment)) continue;
      
      // Vérifie que c'est uniquement des lettres
      if (!/^[a-z]+$/.test(fragment)) continue;
      
      // Ajoute le fragment à l'index
      if (!fragmentIndex.has(fragment)) {
        fragmentIndex.set(fragment, new Set());
      }
      fragmentIndex.get(fragment)!.add(word);
    }
  }
  
  processedCount++;
  if (processedCount % 5000 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  Traité ${processedCount}/${words.length} mots (${elapsed}s)`);
  }
}

const extractionTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`✓ ${fragmentIndex.size} fragments uniques extraits en ${extractionTime}s`);

// Filtre les fragments selon les critères
console.log('Filtrage des fragments valides...');

const validSyllables: Array<{ syllable: string; wordCount: number; isCompleteWord: boolean }> = [];

for (const [fragment, words] of fragmentIndex.entries()) {
  const wordCount = words.size;
  const isCompleteWord = frenchLexicon.has(fragment);
  
  // Critères pour garder un fragment :
  // 1. Apparaît dans au moins 3 mots différents
  // 2. Si c'est un mot complet :
  //    - Exclure les mots de 4 caractères ou moins (trop évidents comme "jour", "chat", "eau")
  //    - Pour les mots plus longs, ils doivent apparaître dans au moins 10 mots différents
  if (isCompleteWord) {
    // Exclure les mots complets courts (4 caractères ou moins) car trop évidents
    if (fragment.length <= 4) {
      continue; // On exclut ces mots complets courts
    }
    // Pour les mots complets plus longs, on les garde seulement s'ils apparaissent dans beaucoup de mots
    // Cela signifie qu'ils sont utilisés comme fragments dans d'autres mots
    if (wordCount >= 10) {
      validSyllables.push({ syllable: fragment, wordCount, isCompleteWord });
    }
  } else {
    // Si ce n'est pas un mot complet, on le garde s'il apparaît dans au moins 3 mots
    if (wordCount >= 3) {
      validSyllables.push({ syllable: fragment, wordCount, isCompleteWord });
    }
  }
}

console.log(`✓ ${validSyllables.length} fragments valides après filtrage`);

// Trie les syllabes par ordre alphabétique
validSyllables.sort((a, b) => a.syllable.localeCompare(b.syllable, 'fr'));

// Écrit le fichier syllabes.txt (une syllabe par ligne)
const syllablesContent = validSyllables.map(s => s.syllable).join('\n');
fs.writeFileSync(syllablesPath, syllablesContent, 'utf8');

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`✓ Fichier syllabes.txt créé avec ${validSyllables.length} syllabes (${totalTime}s total)`);

// Statistiques
const completeWords = validSyllables.filter(s => s.isCompleteWord).length;
const fragments = validSyllables.filter(s => !s.isCompleteWord).length;
const sortedByCount = [...validSyllables].sort((a, b) => b.wordCount - a.wordCount);

console.log('\nStatistiques:');
console.log(`  - Syllabes qui sont des mots complets: ${completeWords}`);
console.log(`  - Syllabes qui sont des fragments: ${fragments}`);
console.log(`  - Syllabe la plus fréquente: "${sortedByCount[0]?.syllable}" (${sortedByCount[0]?.wordCount} mots)`);
console.log(`  - Première syllabe: ${validSyllables[0]?.syllable}`);
console.log(`  - Dernière syllabe: ${validSyllables[validSyllables.length - 1]?.syllable}`);
