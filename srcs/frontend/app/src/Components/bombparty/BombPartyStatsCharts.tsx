import React from 'react';
import type { UserStats, MatchHistory, TrigramStats } from './BombPartyStatsTypes';

interface BombPartyStatsChartsProps {
  userStats: UserStats;
  matchHistory: MatchHistory[];
  trigramStats: TrigramStats[];
}

export function BombPartyStatsCharts({ userStats, matchHistory, trigramStats }: BombPartyStatsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4">📈 Évolution des performances</h3>
        <div className="text-slate-400 text-center py-8">
          Graphique d'évolution des performances (à implémenter)
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-cyan-400 mb-4">🎯 Répartition des trigrammes</h3>
        <div className="text-slate-400 text-center py-8">
          Graphique de répartition des trigrammes (à implémenter)
        </div>
      </div>
    </div>
  );
}
