import type { ValidationResult } from '../core/types';

function normalizeText(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

// lexique simplifie pour le mode local (validation basique uniquement)
// la validation complete se fait cote backend avec le dictionnaire francais complet
const basicLexicon: Set<string> = new Set([
	// quelques mots francais courants pour la validation locale basique
	'maison', 'bonjour', 'chien', 'chat', 'eau', 'terre', 'ciel', 'soleil', 'lune',
	'fleur', 'arbre', 'montagne', 'riviere', 'ocean', 'mer', 'vent', 'pluie', 'neige',
	'foret', 'nuage', 'etoile', 'arc', 'jour', 'nuit', 'matin', 'soir', 'midi',
	'chambre', 'cuisine', 'salon', 'jardin', 'porte', 'fenetre', 'table', 'chaise',
	'livre', 'crayon', 'papier', 'couleur', 'rouge', 'bleu', 'vert', 'jaune', 'noir',
	'blanc', 'gris', 'orange', 'violet', 'rose', 'marron', 'animal', 'oiseau', 'poisson',
	'voiture', 'velo', 'train', 'avion', 'bateau', 'route', 'ville', 'pays', 'france',
	'paris', 'londres', 'manger', 'boire', 'dormir', 'jouer', 'lire', 'ecrire', 'parler',
	'ecouter', 'voir', 'regarder', 'marcher', 'courir', 'sauter', 'danser', 'chanter'
]);

console.log('[Dict] Lexique basique chargé pour la validation locale:', basicLexicon.size, 'mots');

export function debugDictionary() {
	console.log('[Dict] === DICTIONARY DEBUG (FR - Local) ===');
	console.log('[Dict] Lexique basique:', basicLexicon.size, 'mots');
	console.log('[Dict] Note: La validation complète se fait côté backend');
	console.log('[Dict] === END DEBUG ===');
}

export function validateWithDictionary(word: string, syllable: string, usedWords: string[]): ValidationResult {
	const normalizedWord = normalizeText(word);
	const normalizedSyllable = normalizeText(syllable);

	if (normalizedWord.length < 3) return { ok: false, reason: 'too_short' };
	if (!normalizedWord.includes(normalizedSyllable)) return { ok: false, reason: 'no_syllable' };

	const normalizedUsedWords = usedWords.map(u => normalizeText(u));
	if (normalizedUsedWords.includes(normalizedWord)) return { ok: false, reason: 'duplicate' };

	// French letters and optional hyphen
	const validCharsRegex = /^[a-z\-]+$/;
	if (!validCharsRegex.test(normalizedWord)) return { ok: false, reason: 'invalid_chars' };

	// note: la validation complete du dictionnaire se fait cote backend
	// ici on fait juste une validation basique pour le mode local
	// en mode multiplayer, la validation se fait toujours cote backend
	if (!basicLexicon.has(normalizedWord)) {
		// en mode local, on accepte les mots qui contiennent le fragment meme s'ils ne sont pas dans le lexique basique
		// la vraie validation se fera cote backend en mode multiplayer
		return { ok: true }; // accepter pour le mode local
	}
	return { ok: true };
}

export function validateLocal(word: string, syllable: string, usedWords: string[]): ValidationResult {
	const normalizedWord = normalizeText(word);
	const normalizedSyllable = normalizeText(syllable);
	if (normalizedWord.length < 3) return { ok: false, reason: 'too_short' };
	if (!normalizedWord.includes(normalizedSyllable)) return { ok: false, reason: 'no_syllable' };
	const normalizedUsedWords = usedWords.map(used => normalizeText(used));
	if (normalizedUsedWords.includes(normalizedWord)) return { ok: false, reason: 'duplicate' };
	const validCharsRegex = /^[a-z\-]+$/;
	if (!validCharsRegex.test(normalizedWord)) return { ok: false, reason: 'invalid_chars' };
	return { ok: true };
}

export function getWordSuggestions(syllable: string, maxSuggestions: number = 5): string[] {
	// Pour le mode local, retourner des suggestions basiques
	// En mode multiplayer, les suggestions viennent du backend
	const normalizedSyllable = normalizeText(syllable);
	const suggestions: string[] = [];
	// Parcourir le lexique basique pour trouver des mots contenant le fragment
	for (const word of basicLexicon) {
		if (word.includes(normalizedSyllable) && word.length >= 3) {
			suggestions.push(word);
			if (suggestions.length >= maxSuggestions) break;
		}
	}
	return suggestions;
}

export function normalizeTextForGame(text: string): string {
	return normalizeText(text);
}
