import React from 'react';
import { useTranslation } from 'react-i18next';
import type { UserStats } from './BombPartyStatsTypes';

interface BombPartyStatsSummaryProps {
  userStats: UserStats;
}

export function BombPartyStatsSummary({ userStats }: BombPartyStatsSummaryProps) {
  const { t } = useTranslation();
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4">🎯 {t('bombParty.stats.overview.matchStats')}</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.totalMatches')}:</span>
            <span className="text-white font-semibold">{userStats.totalMatches}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.totalWins')}:</span>
            <span className="text-green-400 font-semibold">{userStats.totalWins}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.winRate')}:</span>
            <span className="text-green-400 font-semibold">{userStats.winRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.bestStreak')}:</span>
            <span className="text-yellow-400 font-semibold">{userStats.bestStreak}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4">📝 {t('bombParty.stats.overview.wordStats')}</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.totalWordsSubmitted')}:</span>
            <span className="text-white font-semibold">{userStats.totalWordsSubmitted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.totalValidWords')}:</span>
            <span className="text-green-400 font-semibold">{userStats.totalValidWords}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.accuracy')}:</span>
            <span className="text-green-400 font-semibold">{userStats.accuracy.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.averageResponseTime')}:</span>
            <span className="text-blue-400 font-semibold">{(userStats.averageResponseTime / 1000).toFixed(1)}s</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4">⏱️ {t('bombParty.stats.overview.otherStats')}</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.totalPlayTime')}:</span>
            <span className="text-white font-semibold">{formatDuration(userStats.totalPlayTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.favoriteTrigramTitle')}:</span>
            <span className="text-purple-400 font-semibold">
              {userStats.favoriteTrigram || t('bombParty.stats.overview.none')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
