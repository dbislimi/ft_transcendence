import React from 'react';
import type { StatsTabType } from './BombPartyStatsTypes';

interface BombPartyStatsFiltersProps {
  activeTab: StatsTabType;
  onTabChange: (tab: StatsTabType) => void;
}

export function BombPartyStatsFilters({ activeTab, onTabChange }: BombPartyStatsFiltersProps) {
  const tabs = [
    { key: 'overview' as const, label: 'Vue d\'ensemble', icon: '📈' },
    { key: 'history' as const, label: 'Historique', icon: '📜' },
    { key: 'trigrams' as const, label: 'Trigrammes', icon: '🔤' },
    { key: 'ranking' as const, label: 'Classement', icon: '🏆' }
  ];

  return (
    <div className="flex space-x-1 mb-8 bg-slate-800 p-1 rounded-lg">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex-1 px-4 py-2 rounded-md transition ${
            activeTab === tab.key
              ? 'bg-cyan-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <span className="mr-2">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
