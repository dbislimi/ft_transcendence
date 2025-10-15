import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'trigrams' | 'ranking'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [trigramStats, setTrigramStats] = useState<TrigramStats[]>([]);
  const [globalRanking, setGlobalRanking] = useState<RankingEntry[]>([]);

  useEffect(() => {
    console.log('🔄 [Stats] useEffect déclenché, user:', user);
    
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('[Stats] Timeout atteint, arrêt du chargement');
        setLoading(false);
        setError('Timeout - Impossible de charger les statistiques');
      }
    }, 10000);
    
    if (user?.id) {
      loadUserData();
    } else {
      console.log('[Stats] Pas d\'utilisateur, attente...');
      setLoading(false);
    }
    
    return () => clearTimeout(timeout);
  }, [user?.id]);

  const loadUserData = async () => {
    console.log('🔍 [Stats] loadUserData appelé, user:', user);
    
    if (!user?.id) {
      console.log('[Stats] Pas d\'utilisateur connecté');
      setError('Vous devez être connecté pour voir vos statistiques');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Stats] Chargement des données pour user ID:', user.id);
      
      const [stats, history, trigrams, ranking] = await Promise.all([
        bombPartyStatsService.getUserStats(user.id),
        bombPartyStatsService.getUserMatchHistory(user.id),
        bombPartyStatsService.getUserTrigramStats(user.id),
        bombPartyStatsService.getGlobalRanking()
      ]);

      console.log('[Stats] Données chargées:', { stats, history, trigrams, ranking });

      setUserStats(stats);
      setMatchHistory(history);
      setTrigramStats(trigrams);
      setGlobalRanking(ranking);
    } catch (err) {
      console.error('[Stats] Erreur chargement statistiques:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">Erreur</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={loadUserData}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cyan-400 mb-2">
            📊 Statistiques Bomb Party
          </h1>
          <p className="text-slate-400">
            Découvrez vos performances et comparez-vous aux autres joueurs
          </p>
        </div>

        <BombPartyStatsFilters 
          activeTab={activeTab}
          onTabChange={setActiveTab}
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
    </div>
  );
}
