export interface UserStats {
  userId: number;
  totalMatches: number;
  totalWins: number;
  totalWordsSubmitted: number;
  totalValidWords: number;
  bestStreak: number;
  averageResponseTime: number;
  totalPlayTime: number;
  winRate: number;
  accuracy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchHistory {
  id: number;
  userId: number;
  matchId: number;
  position: number;
  wordsSubmitted: number;
  validWords: number;
  finalLives: number;
  matchDuration: number;
  playedAt: Date;
  isWin: boolean;
}

export interface TrigramStats {
  trigram: string;
  timesUsed: number;
  successRate: number;
  averageTime: number;
  lastUsed: Date;
}

export interface RankingEntry {
  userId: number;
  userName: string;
  totalWins: number;
  totalMatches: number;
  winRate: number;
  bestStreak: number;
  rank: number;
}

export type StatsTableType = 'history' | 'ranking';
export type StatsTabType = 'overview' | 'history' | 'ranking';
