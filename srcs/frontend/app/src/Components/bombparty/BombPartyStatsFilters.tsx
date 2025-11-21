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
    { 
      key: 'overview' as const, 
      label: t('bombParty.stats.tabs.overview'), 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>, 
      requiresAuth: true 
    },
    { 
      key: 'history' as const, 
      label: t('bombParty.stats.tabs.history'), 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
      requiresAuth: true 
    },
    { 
      key: 'ranking' as const, 
      label: t('bombParty.stats.tabs.ranking'), 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>, 
      requiresAuth: false 
    }
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
          <span className="mr-2 inline-flex">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
