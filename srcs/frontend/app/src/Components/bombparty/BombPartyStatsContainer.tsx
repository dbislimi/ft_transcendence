import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { bombPartyStatsService } from '../../services/bombPartyStatsService';
import { BombPartyStatsCharts } from './BombPartyStatsCharts';
import { BombPartyStatsTable } from './BombPartyStatsTable';
import { BombPartyStatsSummary } from './BombPartyStatsSummary';
import { BombPartyStatsFilters } from './BombPartyStatsFilters';
import type { UserStats, MatchHistory, TrigramStats, RankingEntry } from './BombPartyStatsTypes';

export default function BombPartyStatsContainer() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasToken = !!localStorage.getItem('token');
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'trigrams' | 'ranking'>((user?.id && hasToken) ? 'overview' : 'ranking');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [trigramStats, setTrigramStats] = useState<TrigramStats[]>([]);
  const [globalRanking, setGlobalRanking] = useState<RankingEntry[]>([]);

  useEffect(() => {
    console.log('[Stats] useEffect triggered, user:', user);
    loadUserData();
  }, [user?.id]);

  const loadUserData = async () => {
    console.log('[Stats] loadUserData called, user:', user);
    
    setLoading(true);
    setError(null);

    try {
      if (user?.id) {
        console.log('[Stats] Loading complete data for user ID:', user.id);
        
        try {
          const [statsResponse, historyResponse, trigramsResponse, rankingResponse] = await Promise.all([
            bombPartyStatsService.getUserStats(user.id),
            bombPartyStatsService.getUserMatchHistory(user.id),
            bombPartyStatsService.getUserTrigramStats(user.id),
            bombPartyStatsService.getGlobalRanking()
          ]);

          console.log('[Stats] Data loaded:', { statsResponse, historyResponse, trigramsResponse, rankingResponse });

          // Extract data from response objects
          setUserStats(statsResponse.data || statsResponse);
          setMatchHistory(historyResponse.data || historyResponse);
          setTrigramStats(trigramsResponse.data || trigramsResponse);
          setGlobalRanking(rankingResponse.data || []);
        } catch (authError) {
          console.warn('[Stats] Error loading authenticated stats, loading ranking only');
          const rankingResponse = await bombPartyStatsService.getGlobalRanking();
          setGlobalRanking(rankingResponse.data || []);
          setError(t('bombParty.stats.reconnectPrompt'));
        }
      } else {
        console.log('[Stats] Loading global ranking only');
        
        const rankingResponse = await bombPartyStatsService.getGlobalRanking();

        console.log('[Stats] Global ranking loaded:', { rankingResponse });

        setGlobalRanking(rankingResponse.data || []);
      }
    } catch (err) {
      console.error('[Stats] Error loading statistics:', err);
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
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
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
          <h1 className="text-3xl font-bold text-white mb-2">
            📊 {t('bombParty.stats.title')}
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
          <span>←</span>
          <span>{t('bombParty.stats.back')}</span>
        </button>
      </div>

      {!user?.id && (
        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
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

        {activeTab === 'trigrams' && (
          <BombPartyStatsTable 
            type="trigrams"
            data={trigramStats}
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
