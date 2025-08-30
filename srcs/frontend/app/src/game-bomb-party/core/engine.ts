import type { GameState, GamePhase, Player, GameConfig } from './types';
import { validateWithDictionary, validateLocal } from '../data/validator';
import trigramWordsData from '../data/trigram_words.json';

export class BombPartyEngine {
  private state: GameState;
  private lastTrigram: string = '';
  private currentTrigramUsageCount: number = 0; // Nombre de fois que le trigramme actuel a été utilisé
  private totalPlayersInRound: number = 0; // Nombre total de joueurs dans le tour complet

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): GameState {
    return {
      phase: 'LOBBY',
      players: [],
      currentPlayerIndex: 0,
      currentTrigram: '',
      usedWords: [],
      turnEndsAt: 0,
      history: []
    };
  }

  startGame(config: GameConfig): void {
    const players: Player[] = [];
    for (let i = 0; i < config.playersCount; i++) {
      players.push({
        id: `player-${i + 1}`,
        name: `Joueur ${i + 1}`,
        lives: config.livesPerPlayer,
        isEliminated: false
      });
    }

    this.state = {
      phase: 'COUNTDOWN',
      players,
      currentPlayerIndex: 0,
      currentTrigram: '',
      usedWords: [],
      turnEndsAt: 0,
      history: []
    };

    // Initialiser le nouveau système de trigrammes
    this.currentTrigramUsageCount = 0;
    this.totalPlayersInRound = config.playersCount;
    console.log('🎯 Nouveau système de trigrammes: 1 trigramme pour', this.totalPlayersInRound, 'joueurs');
  }

  startCountdown(): void {
    this.state.phase = 'COUNTDOWN';
  }

  startTurn(): void {
    // Vérifier que le joueur actuel est vivant
    if (this.state.players[this.state.currentPlayerIndex]?.isEliminated) {
      console.log('⚠️ Joueur actuel éliminé, passage au suivant');
      this.nextPlayer();
      if (this.state.players[this.state.currentPlayerIndex]?.isEliminated) {
        // Tous les joueurs sont éliminés
        this.state.phase = 'GAME_OVER';
        return;
      }
    }
    
    this.state.phase = 'TURN_ACTIVE';
    
    // Nouveau système : un trigramme par tour complet
    if (this.currentTrigramUsageCount === 0) {
      // Premier joueur du tour complet, choisir un nouveau trigramme
      this.state.currentTrigram = this.getNewTrigram();
      console.log('🎯 Nouveau trigramme choisi:', this.state.currentTrigram, 'pour', this.totalPlayersInRound, 'joueurs');
    } else if (this.currentTrigramUsageCount >= this.totalPlayersInRound) {
      // Tour complet terminé, réinitialiser le compteur
      this.currentTrigramUsageCount = 0;
      this.state.currentTrigram = this.getNewTrigram();
      console.log('🎯 Tour complet terminé, nouveau trigramme:', this.state.currentTrigram);
    } else {
      // Garder le même trigramme pour les joueurs suivants
      console.log('🔄 Même trigramme:', this.state.currentTrigram, '(', this.currentTrigramUsageCount + 1, '/', this.totalPlayersInRound, ')');
    }
    
    this.state.turnEndsAt = performance.now() + 15000; // 15 secondes par défaut
    
    console.log('🔄 Tour démarré pour:', this.state.players[this.state.currentPlayerIndex]?.name, 'Trigramme:', this.state.currentTrigram);
  }

  private getNewTrigram(): string {
    // Extraire les clés (trigrammes) du fichier trigram_words.json
    const availableTrigrams = Object.keys(trigramWordsData).filter(t => t !== this.lastTrigram);
    if (availableTrigrams.length === 0) {
      // Si tous les trigrammes ont été utilisés, réinitialiser
      availableTrigrams.push(...Object.keys(trigramWordsData));
    }
    
    const randomIndex = Math.floor(Math.random() * availableTrigrams.length);
    const newTrigram = availableTrigrams[randomIndex];
    this.lastTrigram = newTrigram;
    return newTrigram;
  }

  submitWord(word: string, msTaken: number): boolean {
    console.log('🔍 Validation du mot:', word, 'pour le trigramme:', this.state.currentTrigram);
    
    // Validation avec dictionnaire français
    const validation = validateWithDictionary(word, this.state.currentTrigram, this.state.usedWords);
    console.log('📋 Résultat de validation:', validation);
    
    if (validation.ok) {
      // Mot valide
      console.log('✅ Mot valide accepté:', word);
      this.state.usedWords.push(word.toLowerCase());
      this.state.history.push({
        playerId: this.state.players[this.state.currentPlayerIndex].id,
        word,
        ok: true,
        msTaken
      });
      
      this.state.phase = 'RESOLVE';
      return true;
    } else {
      // Mot invalide
      console.log('❌ Mot invalide rejeté:', word, 'Raison:', validation.reason);
      this.state.history.push({
        playerId: this.state.players[this.state.currentPlayerIndex].id,
        word,
        ok: false,
        msTaken
      });
      
      this.state.phase = 'RESOLVE';
      return false;
    }
  }

  resolveTurn(wordValid: boolean, timeExpired: boolean): void {
    console.log('🔄 Résolution du tour - Mot valide:', wordValid, 'Temps expiré:', timeExpired);
    
    // Vérification de sécurité
    if (this.state.players.length === 0 || this.state.currentPlayerIndex >= this.state.players.length) {
      console.error('❌ Erreur: Aucun joueur ou index invalide');
      return;
    }
    
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    
    if (!currentPlayer) {
      console.error('❌ Erreur: Joueur actuel non trouvé');
      return;
    }
    
    console.log('👤 Joueur actuel:', currentPlayer.name, 'Vies restantes:', currentPlayer.lives);
    
    if (!wordValid || timeExpired) {
      // Perte d'une vie
      console.log('💔 Perte d\'une vie pour:', currentPlayer.name);
      currentPlayer.lives = Math.max(0, currentPlayer.lives - 1);
      
      if (currentPlayer.lives === 0) {
        console.log('💀 Joueur éliminé:', currentPlayer.name);
        currentPlayer.isEliminated = true;
      }
    } else {
      console.log('✅ Aucune vie perdue pour:', currentPlayer.name);
    }

    // Vérifier s'il reste un seul joueur vivant
    const alivePlayers = this.state.players.filter(p => !p.isEliminated);
    console.log('👥 Joueurs vivants restants:', alivePlayers.length);
    
    if (alivePlayers.length <= 1) {
      console.log('🏁 Fin de partie - Vainqueur:', alivePlayers[0]?.name);
      this.state.phase = 'GAME_OVER';
      return;
    }

    // Incrémenter le compteur d'utilisation du trigramme
    this.currentTrigramUsageCount++;
    console.log('📊 Trigramme utilisé:', this.currentTrigramUsageCount, '/', this.totalPlayersInRound);
    
    // Passer au joueur suivant
    this.nextPlayer();
    
    // Démarrer le prochain tour
    this.startTurn();
  }

  private nextPlayer(): void {
    if (this.state.players.length === 0) return;
    
    let attempts = 0;
    const maxAttempts = this.state.players.length * 2; // Éviter les boucles infinies
    
    do {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      attempts++;
      
      // Vérification de sécurité
      if (attempts > maxAttempts) {
        console.error('❌ Erreur: Impossible de trouver le prochain joueur');
        break;
      }
    } while (this.state.players[this.state.currentPlayerIndex]?.isEliminated);
    
    // Vérification finale
    if (!this.state.players[this.state.currentPlayerIndex]) {
      console.error('❌ Erreur: Aucun joueur valide trouvé');
      this.state.phase = 'GAME_OVER';
    }
  }

  getState(): GameState {
    return { ...this.state };
  }

  // Nouvelles méthodes pour le système de trigrammes
  getCurrentTrigramUsageCount(): number {
    return this.currentTrigramUsageCount;
  }

  getTotalPlayersInRound(): number {
    return this.totalPlayersInRound;
  }

  getCurrentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex];
  }

  getAlivePlayersCount(): number {
    return this.state.players.filter(p => !p.isEliminated).length;
  }

  isGameOver(): boolean {
    return this.state.phase === 'GAME_OVER';
  }

  getWinner(): Player | null {
    if (this.state.phase !== 'GAME_OVER') return null;
    const alivePlayers = this.state.players.filter(p => !p.isEliminated);
    return alivePlayers.length === 1 ? alivePlayers[0] : null;
  }

  reset(): void {
    this.state = this.getInitialState();
    this.lastTrigram = '';
  }

  // Nouvelle méthode pour obtenir des suggestions de mots
  getWordSuggestions(maxSuggestions: number = 5): string[] {
    if (!this.state.currentTrigram) return [];
    
    const trigramWords = trigramWordsData[this.state.currentTrigram as keyof typeof trigramWordsData];
    if (!trigramWords) return [];
    
    // Filtrer les mots déjà utilisés et retourner des suggestions
    return trigramWords
      .filter(word => !this.state.usedWords.includes(word.toLowerCase()))
      .slice(0, maxSuggestions);
  }

  // Méthode pour obtenir des informations sur le trigramme actuel
  getCurrentTrigramInfo(): { trigram: string; availableWords: number; totalWords: number } {
    if (!this.state.currentTrigram) {
      return { trigram: '', availableWords: 0, totalWords: 0 };
    }
    
    const trigramWords = trigramWordsData[this.state.currentTrigram as keyof typeof trigramWordsData] || [];
    const availableWords = trigramWords.filter(word => !this.state.usedWords.includes(word.toLowerCase())).length;
    
    return {
      trigram: this.state.currentTrigram,
      availableWords,
      totalWords: trigramWords.length
    };
  }
}
