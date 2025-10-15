import React from 'react';
import type { MatchHistory, TrigramStats, RankingEntry, StatsTableType } from './BombPartyStatsTypes';

interface BombPartyStatsTableProps {
  type: StatsTableType;
  data: MatchHistory[] | TrigramStats[] | RankingEntry[];
  user: any;
}

export function BombPartyStatsTable({ type, data, user }: BombPartyStatsTableProps) {
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
          <h3 className="text-lg font-semibold text-cyan-400">📜 Historique des parties</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-300">Date</th>
                <th className="px-4 py-3 text-left text-slate-300">Position</th>
                <th className="px-4 py-3 text-left text-slate-300">Mots</th>
                <th className="px-4 py-3 text-left text-slate-300">Vies restantes</th>
                <th className="px-4 py-3 text-left text-slate-300">Durée</th>
                <th className="px-4 py-3 text-left text-slate-300">Résultat</th>
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
                      match.position === 1 
                        ? 'bg-green-600 text-white' 
                        : match.position <= 3 
                        ? 'bg-yellow-600 text-white'
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
                      {match.isWin ? 'Victoire' : 'Défaite'}
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

  if (type === 'trigrams') {
    const trigramData = data as TrigramStats[];
    return (
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-cyan-400">🔤 Statistiques par trigramme</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-300">Trigramme</th>
                <th className="px-4 py-3 text-left text-slate-300">Utilisé</th>
                <th className="px-4 py-3 text-left text-slate-300">Taux de réussite</th>
                <th className="px-4 py-3 text-left text-slate-300">Temps moyen</th>
                <th className="px-4 py-3 text-left text-slate-300">Dernière utilisation</th>
              </tr>
            </thead>
            <tbody>
              {trigramData.map((stat) => (
                <tr key={stat.trigram} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <span className="bg-cyan-600 text-white px-2 py-1 rounded text-sm font-mono">
                      {stat.trigram.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{stat.timesUsed}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <span className="text-slate-300 mr-2">{stat.successRate.toFixed(1)}%</span>
                      <div className="w-16 bg-slate-600 rounded-full h-2">
                        <div 
                          className="bg-green-400 h-2 rounded-full" 
                          style={{ width: `${stat.successRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{(stat.averageTime / 1000).toFixed(1)}s</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">
                    {formatDate(stat.lastUsed)}
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
          <h3 className="text-lg font-semibold text-cyan-400">🏆 Classement global</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-300">Rang</th>
                <th className="px-4 py-3 text-left text-slate-300">Joueur</th>
                <th className="px-4 py-3 text-left text-slate-300">Victoires</th>
                <th className="px-4 py-3 text-left text-slate-300">Parties</th>
                <th className="px-4 py-3 text-left text-slate-300">Taux de victoire</th>
                <th className="px-4 py-3 text-left text-slate-300">Meilleur streak</th>
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
                        <span className="ml-2 text-cyan-400 text-xs">(Vous)</span>
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
