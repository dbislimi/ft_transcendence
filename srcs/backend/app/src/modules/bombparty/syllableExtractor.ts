// fonction pour extraire les syllabes d'un mot francais
// une syllabe contient au moins une voyelle

const VOYELLES = 'aeiouyàâäéèêëïîôöùûüÿ';
const CONSONNES = 'bcdfghjklmnpqrstvwxz';

function isVoyelle(char: string): boolean {
  return VOYELLES.includes(char.toLowerCase());
}

function isConsonne(char: string): boolean {
  return CONSONNES.includes(char.toLowerCase());
}

// extrait les syllabes d'un mot francais
// algorithme simplifie base sur les voyelles
// une syllabe contient au moins une voyelle
export function extractSyllables(word: string): string[] {
  const normalized = word.toLowerCase().trim();
  if (normalized.length === 0) return [];
  
  const syllables: string[] = [];
  let i = 0;
  
  while (i < normalized.length) {
    let syllable = '';
    
    // Commencer par les consonnes (optionnelles)
    while (i < normalized.length && isConsonne(normalized[i])) {
      syllable += normalized[i];
      i++;
    }
    
    // Ajouter la voyelle (obligatoire)
    if (i < normalized.length && isVoyelle(normalized[i])) {
      syllable += normalized[i];
      i++;
      
      // ajoute les voyelles consecutives (ex: "eau", "oui")
      while (i < normalized.length && isVoyelle(normalized[i])) {
        syllable += normalized[i];
        i++;
      }
    }
    
    // ajoute les consonnes finales de la syllabe
    // si la prochaine lettre est une voyelle, on s'arrete ici
    // sinon, on prend une consonne de plus si elle existe
    if (i < normalized.length && isConsonne(normalized[i])) {
      const nextAfterConsonne = normalized[i + 1];
      // si apres cette consonne il y a une voyelle, on garde la consonne pour la prochaine syllabe
      if (nextAfterConsonne && isVoyelle(nextAfterConsonne)) {
        // ne pas ajouter la consonne, elle appartient a la prochaine syllabe
      } else {
        // ajoute la consonne a cette syllabe
        syllable += normalized[i];
        i++;
        // si c'est une consonne double ou un groupe special, prendre une de plus
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
  
  // si aucune syllabe n'a ete trouvee, retourner le mot entier comme une seule syllabe
  if (syllables.length === 0 && normalized.length > 0) {
    return [normalized];
  }
  
  return syllables.filter(s => s.length > 0);
}

// normalise un texte (enleve les accents, met en minuscule)
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// extrait toutes les syllabes possibles d'un mot (y compris les sous-syllabes)
// par exemple, "maison" -> ["mai", "son", "ma", "ai", "on"]
export function getAllSyllablesFromWord(word: string): string[] {
  const normalized = normalizeText(word);
  const syllables = extractSyllables(normalized);
  const allSyllables = new Set<string>();
  
  // ajoute les syllabes completes
  syllables.forEach(s => {
    if (s.length >= 2) {
      allSyllables.add(s);
    }
  });
  
  // ajoute les sous-syllabes (au moins 2 caracteres)
  for (let i = 0; i < normalized.length - 1; i++) {
    for (let j = i + 2; j <= normalized.length; j++) {
      const sub = normalized.substring(i, j);
      // verifie que la sous-chaine contient au moins une voyelle
      if (sub.split('').some(c => isVoyelle(c))) {
        allSyllables.add(sub);
      }
    }
  }
  
  return Array.from(allSyllables).filter(s => s.length >= 2 && s.length <= 6);
}

