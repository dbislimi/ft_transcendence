import Database from 'sqlite3';
import type { BadgeType, UserProgress, Badge } from '../../../../shared/bombparty/types';

export interface DBResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

const LEVEL_XP_REQUIREMENTS: number[] = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000
];

function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= LEVEL_XP_REQUIREMENTS.length) {
    return LEVEL_XP_REQUIREMENTS[level - 1];
  }
  // formule exponentielle pour niveaux > 10
  const baseXp = LEVEL_XP_REQUIREMENTS[LEVEL_XP_REQUIREMENTS.length - 1];
  const levelDiff = level - LEVEL_XP_REQUIREMENTS.length;
  return baseXp + (levelDiff * levelDiff * 2000);
}

function calculateLevel(totalXp: number): { level: number; currentXp: number; xpToNext: number } {
  let level = 1;
  let xpForCurrentLevel = 0;
  let xpForNextLevel = getXpForLevel(2);

  while (totalXp >= xpForNextLevel && level < 100) {
    level++;
    xpForCurrentLevel = xpForNextLevel;
    xpForNextLevel = getXpForLevel(level + 1);
  }

  const currentXp = totalXp - xpForCurrentLevel;
  const xpToNext = xpForNextLevel - totalXp;

  return { level, currentXp, xpToNext };
}

const BADGE_DEFINITIONS: Record<BadgeType, { name: string; description: string; icon: string; rarity: string }> = {
  first_win: {
    name: 'Première Victoire',
    description: 'Gagnez votre première partie',
    icon: '🏆',
    rarity: 'common'
  },
  streak_10: {
    name: 'Série de 10',
    description: 'Gagnez 10 parties consécutives',
    icon: '🔥',
    rarity: 'uncommon'
  },
  streak_20: {
    name: 'Série de 20',
    description: 'Gagnez 20 parties consécutives',
    icon: '💥',
    rarity: 'rare'
  },
  perfect_game: {
    name: 'Partie Parfaite',
    description: 'Gagnez une partie sans perdre de vie',
    icon: '✨',
    rarity: 'rare'
  },
  speed_demon: {
    name: 'Démon de la Vitesse',
    description: 'Temps de réponse moyen inférieur à 2 secondes',
    icon: '⚡',
    rarity: 'uncommon'
  },
  word_master: {
    name: 'Maître des Mots',
    description: 'Soumettez 1000 mots valides',
    icon: '📚',
    rarity: 'epic'
  },
  survivor: {
    name: 'Survivant',
    description: 'Gagnez avec seulement 1 vie restante',
    icon: '🛡️',
    rarity: 'uncommon'
  },
  centurion: {
    name: 'Centurion',
    description: 'Jouez 100 parties',
    icon: '💯',
    rarity: 'epic'
  },
  undefeated: {
    name: 'Invincible',
    description: 'Gagnez 50 parties',
    icon: '👑',
    rarity: 'legendary'
  },
  trigram_expert: {
    name: 'Expert en Trigrammes',
    description: 'Taux de réussite supérieur à 90%',
    icon: '🎯',
    rarity: 'rare'
  }
};

export class BombPartyStatsService {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  // Calculer le XP gagné après une partie
  calculateXpGain(matchData: {
    isWin: boolean;
    wordsSubmitted: number;
    validWords: number;
    bestStreak: number;
    matchDuration: number;
  }): number {
    let xp = 0;

    xp += 10;

    if (matchData.isWin) {
      xp += 50;
    }

    xp += matchData.validWords * 2;

    xp += matchData.bestStreak * 5;

    // bonus rapidite: moins de temps = plus de xp
    const avgTimePerWord = matchData.matchDuration / Math.max(matchData.wordsSubmitted, 1);
    if (avgTimePerWord < 3) {
      xp += 20;
    }

    return Math.floor(xp);
  }

  async getUserProgress(userId: number): Promise<DBResult<UserProgress>> {
    // table supprimee, retour vide
    return Promise.resolve({ success: false, error: 'progress not available' });
  }


  async updateProgress(
    userId: number,
    matchData: {
      isWin: boolean;
      wordsSubmitted: number;
      validWords: number;
      bestStreak: number;
      matchDuration: number;
      finalLives?: number;
    },
    userStats: {
      totalWins: number;
      totalMatches: number;
      totalValidWords: number;
      averageResponseTime: number;
      bestStreak: number;
    }
  ): Promise<DBResult<{ newBadges: Badge[]; levelUp: boolean }>> {
    // table supprimee, retour vide
    return Promise.resolve({ 
      success: true, 
      data: { newBadges: [], levelUp: false } 
    });
  }


  async updateUserPreferences(
    userId: number,
    preferences: { theme?: string; avatar?: string }
  ): Promise<DBResult<void>> {
    // table supprimee, retour ok
    return Promise.resolve({ success: true });
  }
}

