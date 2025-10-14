import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { bombPartyStatsService } from '../services/bombPartyStatsService';

interface UserStats {
  userId: number;
  totalMatches: number;
  totalWins: number;
  totalWordsSubmitted: number;
  totalValidWords: number;
  bestStreak: number;
  averageResponseTime: number;
  favoriteTrigram: string | null;
  totalPlayTime: number;
  winRate: number;
  accuracy: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MatchHistory {
  id: number;
  userId: number;
  matchId: number;
  position: number;
  wordsSubmitted: number;
  validWords: number;
  finalLives: number;
  matchDuration: number;
  playedAt: Date;
  isWin: boolean;
}

interface TrigramStats {
  trigram: string;
  timesUsed: number;
  successRate: number;
  averageTime: number;
  lastUsed: Date;
}

interface RankingEntry {
  userId: number;
  userName: string;
  totalWins: number;
  totalMatches: number;
  winRate: number;
  bestStreak: number;
  rank: number;
}

export default function BombPartyStats() {
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
        console.log('⏰ [Stats] Timeout atteint, arrêt du chargement');
        setLoading(false);
        setError('Timeout - Impossible de charger les statistiques');
      }
    }, 10000); // 10 secondes
    
    if (user?.id) {
      loadUserData();
    } else {
      console.log('⏳ [Stats] Pas d\'utilisateur, attente...');
      setLoading(false);
    }
    
    return () => clearTimeout(timeout);
  }, [user?.id]);

  const loadUserData = async () => {
    console.log('🔍 [Stats] loadUserData appelé, user:', user);
    
    if (!user?.id) {
      console.log('❌ [Stats] Pas d\'utilisateur connecté');
      setError('Vous devez être connecté pour voir vos statistiques');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📊 [Stats] Chargement des données pour user ID:', user.id);
      
      const [stats, history, trigrams, ranking] = await Promise.all([
        bombPartyStatsService.getUserStats(user.id),
        bombPartyStatsService.getUserMatchHistory(user.id),
        bombPartyStatsService.getUserTrigramStats(user.id),
        bombPartyStatsService.getGlobalRanking()
      ]);

      console.log('✅ [Stats] Données chargées:', { stats, history, trigrams, ranking });

      setUserStats(stats);
      setMatchHistory(history);
      setTrigramStats(trigrams);
      setGlobalRanking(ranking);
    } catch (err) {
      console.error('❌ [Stats] Erreur chargement statistiques:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cyan-400 mb-2">
            📊 Statistiques Bomb Party
          </h1>
          <p className="text-slate-400">
            Découvrez vos performances et comparez-vous aux autres joueurs
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-slate-800 p-1 rounded-lg">
          {[
            { key: 'overview', label: 'Vue d\'ensemble', icon: '📈' },
            { key: 'history', label: 'Historique', icon: '📜' },
            { key: 'trigrams', label: 'Trigrammes', icon: '🔤' },
            { key: 'ranking', label: 'Classement', icon: '🏆' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
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

        {/* Contenu des onglets */}
        {activeTab === 'overview' && userStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Statistiques principales */}
            <div className="bg-slate-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">🎯 Performance Générale</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Parties jouées:</span>
                  <span className="text-white font-semibold">{userStats.totalMatches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Victoires:</span>
                  <span className="text-green-400 font-semibold">{userStats.totalWins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Taux de victoire:</span>
                  <span className="text-green-400 font-semibold">{userStats.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Meilleur streak:</span>
                  <span className="text-yellow-400 font-semibold">{userStats.bestStreak}</span>
                </div>
              </div>
            </div>

            {/* Statistiques de mots */}
            <div className="bg-slate-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">📝 Mots</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mots soumis:</span>
                  <span className="text-white font-semibold">{userStats.totalWordsSubmitted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mots valides:</span>
                  <span className="text-green-400 font-semibold">{userStats.totalValidWords}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Précision:</span>
                  <span className="text-green-400 font-semibold">{userStats.accuracy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Temps moyen:</span>
                  <span className="text-blue-400 font-semibold">{(userStats.averageResponseTime / 1000).toFixed(1)}s</span>
                </div>
              </div>
            </div>

            {/* Statistiques de temps */}
            <div className="bg-slate-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">⏱️ Temps de jeu</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Temps total:</span>
                  <span className="text-white font-semibold">{formatDuration(userStats.totalPlayTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trigramme favori:</span>
                  <span className="text-purple-400 font-semibold">
                    {userStats.favoriteTrigram || 'Aucun'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Membre depuis:</span>
                  <span className="text-slate-300 text-sm">
                    {formatDate(userStats.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
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
                  {matchHistory.map((match) => (
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
        )}

        {activeTab === 'trigrams' && (
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
                  {trigramStats.map((stat) => (
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
        )}

        {activeTab === 'ranking' && (
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
                  {globalRanking.map((entry) => (
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
        )}
      </div>
    </div>
  );
}
