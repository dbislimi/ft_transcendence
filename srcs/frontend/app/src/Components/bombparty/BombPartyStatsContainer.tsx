import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { bombPartyStatsService } from '../../services/bombPartyStatsService';
import { logger } from '../../utils/logger';
import { BombPartyStatsCharts } from './BombPartyStatsCharts';
import { BombPartyStatsTable } from './BombPartyStatsTable';
import { BombPartyStatsSummary } from './BombPartyStatsSummary';
import { BombPartyStatsFilters } from './BombPartyStatsFilters';
import type { UserStats, MatchHistory, RankingEntry } from './BombPartyStatsTypes';

export default function BombPartyStatsContainer() {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();
  const hasToken = !!sessionStorage.getItem('token');
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'ranking'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [globalRanking, setGlobalRanking] = useState<RankingEntry[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [globalHistory, setGlobalHistory] = useState<any[]>([]);

  useEffect(() => {
    logger.debug('useEffect triggered', { userId: user?.id });
    loadUserData();
  }, [user?.id]);

  const loadUserData = async () => {
    logger.debug('loadUserData called', { userId: user?.id });

    setLoading(true);
    setError(null);

    try {
      // Toujours charger les données globales (accessibles à tous)
      const [globalStatsResponse, globalHistoryResponse, rankingResponse] = await Promise.all([
        bombPartyStatsService.getGlobalStats(),
        bombPartyStatsService.getGlobalMatchHistory(),
        bombPartyStatsService.getGlobalRanking()
      ]);

      setGlobalStats(globalStatsResponse.data || globalStatsResponse);
      setGlobalHistory(globalHistoryResponse.data || globalHistoryResponse);
      setGlobalRanking(rankingResponse.data || []);

      // Si l'utilisateur est connecté, charger aussi ses stats personnelles
      if (user?.id) {
        logger.debug('Loading user-specific data', { userId: user.id });

        try {
          const [statsResponse, historyResponse] = await Promise.all([
            bombPartyStatsService.getUserStats(user.id),
            bombPartyStatsService.getUserMatchHistory(user.id)
          ]);

          logger.debug('User data loaded', {
            hasStats: !!statsResponse,
            hasHistory: !!historyResponse
          });

          setUserStats(statsResponse.data || statsResponse);
          setMatchHistory(historyResponse.data || historyResponse);
        } catch (authError) {
          logger.warn('Error loading user stats, continuing with global data', { error: authError });
          // Ne pas définir d'erreur, juste continuer avec les données globales
        }
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

      <BombPartyStatsFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAuthenticated={!!user?.id}
      />

      {activeTab === 'overview' && globalStats && (
        <BombPartyStatsSummary 
          userStats={userStats} 
          globalStats={globalStats}
          isAuthenticated={!!user?.id}
        />
      )}

      {activeTab === 'history' && (
        <BombPartyStatsTable
          type="history"
          data={globalHistory}
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
