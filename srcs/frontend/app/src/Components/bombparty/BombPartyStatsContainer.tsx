import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { bombPartyStatsService } from '../../services/bombPartyStatsService';
import { logger } from '../../utils/logger';
import { BombPartyStatsCharts } from './BombPartyStatsCharts';
import { BombPartyStatsTable } from './BombPartyStatsTable';
import { BombPartyStatsSummary } from './BombPartyStatsSummary';
import { BombPartyStatsFilters } from './BombPartyStatsFilters';
import type { UserStats, MatchHistory, RankingEntry } from './BombPartyStatsTypes';

export default function BombPartyStatsContainer() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasToken = !!localStorage.getItem('token');
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'ranking'>((user?.id && hasToken) ? 'overview' : 'ranking');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [globalRanking, setGlobalRanking] = useState<RankingEntry[]>([]);

  useEffect(() => {
    logger.debug('useEffect triggered', { userId: user?.id });
    loadUserData();
  }, [user?.id]);

  const loadUserData = async () => {
    logger.debug('loadUserData called', { userId: user?.id });
    
    setLoading(true);
    setError(null);

    try {
      if (user?.id) {
        logger.debug('Loading complete data for user', { userId: user.id });
        
        try {
          const [statsResponse, historyResponse, rankingResponse] = await Promise.all([
            bombPartyStatsService.getUserStats(user.id),
            bombPartyStatsService.getUserMatchHistory(user.id),
            bombPartyStatsService.getGlobalRanking()
          ]);

          logger.debug('data loaded', { 
            hasStats: !!statsResponse,
            hasHistory: !!historyResponse,
            hasRanking: !!rankingResponse
          });

          setUserStats(statsResponse.data || statsResponse);
          setMatchHistory(historyResponse.data || historyResponse);
          setGlobalRanking(rankingResponse.data || []);
        } catch (authError) {
          logger.warn('Error loading authenticated stats, loading ranking only', { error: authError });
          const rankingResponse = await bombPartyStatsService.getGlobalRanking();
          setGlobalRanking(rankingResponse.data || []);
          setError(t('bombParty.stats.reconnectPrompt'));
        }
      } else {
        logger.debug('Loading global ranking only');
        
        const rankingResponse = await bombPartyStatsService.getGlobalRanking();

        logger.debug('Global ranking loaded', { count: rankingResponse.data?.length || 0 });

        setGlobalRanking(rankingResponse.data || []);
      }
    } catch (err) {
      logger.error('Error loading statistics', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">{t('bombParty.stats.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg className="w-24 h-24 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-white mb-2">{t('bombParty.stats.error')}</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={loadUserData}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition"
          >
            {t('bombParty.stats.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('bombParty.stats.title')}
          </h1>
          <p className="text-gray-300">
            {user?.id 
              ? t('bombParty.stats.subtitle')
              : t('bombParty.stats.subtitleGuest')}
          </p>
        </div>
        <button
          onClick={() => navigate('/bomb-party')}
          className="px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg text-purple-300 hover:from-purple-600/30 hover:to-blue-600/30 transition-all duration-300 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{t('bombParty.stats.back')}</span>
        </button>
      </div>

      {!user?.id && (
        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-blue-300 font-semibold mb-1">{t('bombParty.stats.loginPrompt')}</p>
            <p className="text-gray-300 text-sm">
              {t('bombParty.stats.loginPromptDesc')}
            </p>
          </div>
        </div>
      )}

      <BombPartyStatsFilters 
          activeTab={activeTab}
        onTabChange={setActiveTab}
        isAuthenticated={!!user?.id}
      />

      {activeTab === 'overview' && userStats && (
        <BombPartyStatsSummary userStats={userStats} />
      )}

      {activeTab === 'history' && (
        <BombPartyStatsTable 
          type="history"
          data={matchHistory}
          user={user}
        />
      )}

      {activeTab === 'ranking' && (
        <BombPartyStatsTable 
          type="ranking"
          data={globalRanking}
          user={user}
        />
      )}
    </div>
  );
}
