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
        <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {t('bombParty.stats.overview.matchStats')}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.totalMatches')}:</span>
            <span className="text-white font-semibold">{userStats.totalMatches ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.totalWins')}:</span>
            <span className="text-green-400 font-semibold">{userStats.totalWins ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.winRate')}:</span>
            <span className="text-green-400 font-semibold">
              {userStats.winRate != null ? userStats.winRate.toFixed(1) : '0.0'}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.bestStreak')}:</span>
            <span className="text-yellow-400 font-semibold">{userStats.bestStreak ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {t('bombParty.stats.overview.wordStats')}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.totalWordsSubmitted')}:</span>
            <span className="text-white font-semibold">{userStats.totalWordsSubmitted ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.totalValidWords')}:</span>
            <span className="text-green-400 font-semibold">{userStats.totalValidWords ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.accuracy')}:</span>
            <span className="text-green-400 font-semibold">
              {userStats.accuracy != null ? userStats.accuracy.toFixed(1) : '0.0'}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.averageResponseTime')}:</span>
            <span className="text-blue-400 font-semibold">
              {userStats.averageResponseTime != null ? (userStats.averageResponseTime / 1000).toFixed(1) : '0.0'}s
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('bombParty.stats.overview.otherStats')}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-400">{t('bombParty.stats.overview.totalPlayTime')}:</span>
            <span className="text-white font-semibold">{formatDuration(userStats.totalPlayTime ?? 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
