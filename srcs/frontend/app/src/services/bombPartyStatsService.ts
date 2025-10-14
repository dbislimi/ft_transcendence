/**
 * Service pour gérer les statistiques Bomb Party côté frontend
 */

interface GameStats {
  matchId: number;
  isWin: boolean;
  wordsSubmitted: number;
  validWords: number;
  bestStreak: number;
  averageResponseTime: number;
  matchDuration: number;
  position: number;
  finalLives: number;
  favoriteTrigram?: string;
}

interface TrigramAttempt {
  trigram: string;
  isSuccess: boolean;
  responseTime: number;
}

class BombPartyStatsService {
  private baseUrl = 'http://localhost:3000/api/bomb-party';
  private trigramAttempts: TrigramAttempt[] = [];

  /**
   * Récupère le token d'authentification
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Effectue une requête authentifiée
   */
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = this.getAuthToken();
    
    if (!token) {
      throw new Error('Token d\'authentification manquant');
    }

    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });


    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Enregistre une tentative de trigramme
   */
  recordTrigramAttempt(trigram: string, isSuccess: boolean, responseTime: number): void {
    this.trigramAttempts.push({
      trigram,
      isSuccess,
      responseTime
    });
  }

  /**
   * Sauvegarde les statistiques d'une partie
   */
  async saveGameStats(stats: GameStats & { userId: string | number }): Promise<void> {
    try {
      // Sauvegarder les statistiques principales
      await this.fetchWithAuth(`${this.baseUrl}/stats/update`, {
        method: 'POST',
        body: JSON.stringify(stats)
      });

      // Sauvegarder les statistiques de trigrammes
      for (const attempt of this.trigramAttempts) {
        await this.fetchWithAuth(`${this.baseUrl}/trigram-stats/update`, {
          method: 'POST',
          body: JSON.stringify(attempt)
        });
      }

      this.trigramAttempts = [];

      console.log('✅ Statistiques sauvegardées avec succès');
    } catch (error) {
      console.error('❌ Erreur sauvegarde statistiques:', error);
    }
  }

  /**
   * Calcule les statistiques à partir des données de jeu
   */
  calculateGameStats(
    gameData: {
      players: Array<{ id: string; name: string; lives: number; streak: number }>;
      history: Array<{ playerId: string; word: string; ok: boolean; msTaken: number }>;
      usedWords: string[];
      startTime: number;
      endTime: number;
      winnerId?: string;
    },
    playerId: string,
    userId: string | number
  ): GameStats & { userId: string | number } {
    const playerHistory = gameData.history.filter(h => h.playerId === playerId);
    const validWords = playerHistory.filter(h => h.ok);
    const totalResponseTime = playerHistory.reduce((sum, h) => sum + h.msTaken, 0);
    
    const trigramCounts: Record<string, number> = {};
    gameData.usedWords.forEach(word => {
      // Extraire les trigrammes du mot (simplification)
      for (let i = 0; i < word.length - 2; i++) {
        const trigram = word.substring(i, i + 3).toLowerCase();
        trigramCounts[trigram] = (trigramCounts[trigram] || 0) + 1;
      }
    });
    
    const favoriteTrigram = Object.entries(trigramCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    // Calculer la position du joueur
    const player = gameData.players.find(p => p.id === playerId);
    const alivePlayers = gameData.players.filter(p => p.lives > 0);
    const position = alivePlayers.length === 1 ? 1 : 
      alivePlayers.sort((a, b) => b.lives - a.lives).findIndex(p => p.id === playerId) + 1;

    return {
      matchId: Date.now(),
      isWin: gameData.winnerId === playerId,
      wordsSubmitted: playerHistory.length,
      validWords: validWords.length,
      bestStreak: player?.streak || 0,
      averageResponseTime: playerHistory.length > 0 ? totalResponseTime / playerHistory.length : 0,
      matchDuration: Math.floor((gameData.endTime - gameData.startTime) / 1000),
      position,
      finalLives: player?.lives || 0,
      favoriteTrigram,
      userId
    };
  }

  /**
   * Récupère les statistiques d'un utilisateur
   */
  async getUserStats(userId: string | number) {
    return this.fetchWithAuth(`${this.baseUrl}/stats/${userId}`);
  }

  /**
   * Récupère l'historique des parties d'un utilisateur
   */
  async getUserMatchHistory(userId: string | number, limit = 20, offset = 0) {
    return this.fetchWithAuth(`${this.baseUrl}/history/${userId}?limit=${limit}&offset=${offset}`);
  }

  /**
   * Récupère les statistiques de trigrammes d'un utilisateur
   */
  async getUserTrigramStats(userId: string | number, limit = 10) {
    return this.fetchWithAuth(`${this.baseUrl}/trigram-stats/${userId}?limit=${limit}`);
  }

  /**
   * Récupère le classement global
   */
  async getGlobalRanking(limit = 50) {
    return this.fetchWithAuth(`${this.baseUrl}/ranking?limit=${limit}`);
  }
}

// Instance singleton
export const bombPartyStatsService = new BombPartyStatsService();
export default bombPartyStatsService;
