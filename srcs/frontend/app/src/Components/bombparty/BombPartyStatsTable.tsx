import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MatchHistory, RankingEntry, StatsTableType } from './BombPartyStatsTypes';

interface BombPartyStatsTableProps {
  type: StatsTableType;
  data: MatchHistory[] | RankingEntry[];
  user: any;
}

export function BombPartyStatsTable({ type, data, user }: BombPartyStatsTableProps) {
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

  if (type === 'history') {
    const historyData = data as MatchHistory[];
    return (
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('bombParty.stats.history.title')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-300">{t('bombParty.stats.history.date')}</th>
                <th className="px-4 py-3 text-left text-slate-300">{t('bombParty.stats.history.position')}</th>
                <th className="px-4 py-3 text-left text-slate-300">{t('bombParty.stats.history.words')}</th>
                <th className="px-4 py-3 text-left text-slate-300">{t('bombParty.stats.history.livesRemaining')}</th>
                <th className="px-4 py-3 text-left text-slate-300">{t('bombParty.stats.history.duration')}</th>
                <th className="px-4 py-3 text-left text-slate-300">{t('bombParty.stats.history.result')}</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((match) => (
                <tr key={match.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-slate-300 text-sm">
                    {formatDate(match.playedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      match.position === 1 ? 'bg-green-600 text-white' 
                        : match.position <= 3 ? 'bg-yellow-600 text-white'
                        : 'bg-slate-600 text-slate-300'
                    }`}>
                      #{match.position}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {match.validWords}/{match.wordsSubmitted}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{match.finalLives}</td>
                  <td className="px-4 py-3 text-slate-300">{formatDuration(match.matchDuration)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      match.isWin 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {match.isWin ? t('bombParty.stats.history.victory') : t('bombParty.stats.history.defeat')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'ranking') {
    const rankingData = data as RankingEntry[];
    return (
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            {t('bombParty.stats.ranking.title')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-300">{t('bombParty.stats.ranking.rank')}</th>
                <th className="px-4 py-3 text-left text-slate-300">{t('bombParty.stats.ranking.player')}</th>
                <th className="px-4 py-3 text-left text-slate-300">{t('bombParty.stats.ranking.wins')}</th>
                <th className="px-4 py-3 text-left text-slate-300">{t('bombParty.stats.ranking.games')}</th>
                <th className="px-4 py-3 text-left text-slate-300">{t('bombParty.stats.ranking.winRate')}</th>
                <th className="px-4 py-3 text-left text-slate-300">{t('bombParty.stats.ranking.bestStreak')}</th>
              </tr>
            </thead>
            <tbody>
              {rankingData.map((entry) => (
                <tr 
                  key={entry.userId} 
                  className={`border-b border-slate-700 hover:bg-slate-700/50 ${
                    entry.userId.toString() === user?.id ? 'bg-cyan-900/30' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      entry.rank === 1 
                        ? 'bg-yellow-600 text-white' 
                        : entry.rank <= 3 
                        ? 'bg-gray-600 text-white'
                        : 'bg-slate-600 text-slate-300'
                    }`}>
                      #{entry.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-300">
                      {entry.userName}
                      {entry.userId.toString() === user?.id && (
                        <span className="ml-2 text-cyan-400 text-xs">{t('bombParty.stats.ranking.you')}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-green-400 font-semibold">{entry.totalWins}</td>
                  <td className="px-4 py-3 text-slate-300">{entry.totalMatches}</td>
                  <td className="px-4 py-3 text-slate-300">{entry.winRate.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-yellow-400 font-semibold">{entry.bestStreak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}
