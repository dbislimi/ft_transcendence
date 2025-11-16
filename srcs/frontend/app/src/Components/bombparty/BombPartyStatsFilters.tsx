import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StatsTabType } from './BombPartyStatsTypes';

interface BombPartyStatsFiltersProps {
  activeTab: StatsTabType;
  onTabChange: (tab: StatsTabType) => void;
  isAuthenticated?: boolean;
}

export function BombPartyStatsFilters({ activeTab, onTabChange, isAuthenticated = true }: BombPartyStatsFiltersProps) {
  const { t } = useTranslation();
  
  const allTabs = [
    { key: 'overview' as const, label: t('bombParty.stats.tabs.overview'), icon: '📈', requiresAuth: true },
    { key: 'history' as const, label: t('bombParty.stats.tabs.history'), icon: '📜', requiresAuth: true },
    { key: 'ranking' as const, label: t('bombParty.stats.tabs.ranking'), icon: '🏆', requiresAuth: false }
  ];

  const tabs = isAuthenticated ? allTabs : allTabs.filter(tab => !tab.requiresAuth);

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
