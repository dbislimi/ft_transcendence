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
}

import { API_BASE_URL } from '../config/api';

interface TrigramAttempt {
  trigram: string;
  isSuccess: boolean;
  responseTime: number;
}

class BombPartyStatsService {
  private baseUrl = `${API_BASE_URL}/api/bomb-party`;
  private trigramAttempts: TrigramAttempt[] = [];

  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  private getUserIdFromToken(): number | null {
    const token = this.getAuthToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id;
    } catch (error) {
      console.error('[BombPartyStatsService] Error parsing token:', error);
      return null;
    }
  }

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

  recordTrigramAttempt(trigram: string, isSuccess: boolean, responseTime: number): void {
    this.trigramAttempts.push({
      trigram,
      isSuccess,
      responseTime
    });
  }

  async saveGameStats(stats: GameStats & { userId: string | number; playerName?: string }): Promise<void> {
    try {
      const token = this.getAuthToken();

      console.log('[bombPartyStatsService] saveGameStats:', {
        hasToken: !!token,
        userId: stats.userId,
        userIdType: typeof stats.userId,
        condition: !!(token && stats.userId)
      });

      if (token && stats.userId && stats.userId !== 'local') {
        console.log('[bombPartyStatsService] Sauvegarde avec authentification');
        await this.fetchWithAuth(`${this.baseUrl}/stats/update`, {
          method: 'POST',
          body: JSON.stringify(stats)
        });

        for (const attempt of this.trigramAttempts) {
          await this.fetchWithAuth(`${this.baseUrl}/trigram-stats/update`, {
            method: 'POST',
            body: JSON.stringify(attempt)
          });
        }

        console.log('Statistiques sauvegardées avec succès (utilisateur authentifié)');
      } else {
        console.log('[bombPartyStatsService] Sauvegarde en mode local/guest');
        const playerName = stats.playerName || `Guest_${Date.now()}`;

        const response = await fetch(`${this.baseUrl}/stats/update-local`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...stats,
            playerName: playerName
          })
        });

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        console.log('Statistiques sauvegardées avec succès (mode local)');
      }

      this.trigramAttempts = [];
    } catch (error) {
      console.error('Erreur sauvegarde statistiques:', error);
    }
  }

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
      userId
    };
  }

  async getUserStats(userId?: string | number) {
    const actualUserId = this.getUserIdFromToken() || userId;
    if (!actualUserId) {
      throw new Error('User ID not available');
    }
    return this.fetchWithAuth(`${this.baseUrl}/stats/${actualUserId}`);
  }

  async getUserMatchHistory(userId?: string | number, limit = 20, offset = 0) {
    const actualUserId = this.getUserIdFromToken() || userId;
    if (!actualUserId) {
      throw new Error('User ID not available');
    }
    return this.fetchWithAuth(`${this.baseUrl}/history/${actualUserId}?limit=${limit}&offset=${offset}`);
  }

  async getUserTrigramStats(userId?: string | number, limit = 10) {
    const actualUserId = this.getUserIdFromToken() || userId;
    if (!actualUserId) {
      throw new Error('User ID not available');
    }
    return this.fetchWithAuth(`${this.baseUrl}/trigram-stats/${actualUserId}?limit=${limit}`);
  }

  async getGlobalRanking(limit = 50) {
    const response = await fetch(`${this.baseUrl}/ranking?limit=${limit}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserProgress(userId?: string | number) {
    const actualUserId = this.getUserIdFromToken() || userId;
    if (!actualUserId) {
      throw new Error('User ID not available');
    }
    return this.fetchWithAuth(`${this.baseUrl}/progress/${actualUserId}`);
  }

  async updateProgress(matchData: {
    isWin: boolean;
    wordsSubmitted: number;
    validWords: number;
    bestStreak: number;
    matchDuration: number;
    finalLives?: number;
  }) {
    return this.fetchWithAuth(`${this.baseUrl}/progress/update`, {
      method: 'POST',
      body: JSON.stringify(matchData)
    });
  }

  async updatePreferences(preferences: { theme?: string; avatar?: string }) {
    return this.fetchWithAuth(`${this.baseUrl}/progress/preferences`, {
      method: 'POST',
      body: JSON.stringify(preferences)
    });
  }
}

export const bombPartyStatsService = new BombPartyStatsService();
export default bombPartyStatsService;
