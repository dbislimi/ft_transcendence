import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bombPartyStatsService } from '../services/bombPartyStatsService';
import { logger } from '../utils/logger';
import type { UserProgress, Badge } from '@shared/bombparty/types';
import type { UserStats } from '../Components/bombparty/BombPartyStatsTypes';

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-gray-500',
  uncommon: 'bg-green-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-yellow-500'
};

export default function BombPartyProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadProfileData();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadProfileData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [progressResponse, statsResponse] = await Promise.all([
        bombPartyStatsService.getUserProgress(user!.id),
        bombPartyStatsService.getUserStats(user!.id)
      ]);

      setProgress(progressResponse.data || progressResponse);
      setUserStats(statsResponse.data || statsResponse);
    } catch (err) {
      logger.error('Error loading profile data', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-white mb-2">Accès restreint</h2>
          <p className="text-gray-300 mb-4">Vous devez être connecté pour voir votre profil</p>
          <button
            onClick={() => navigate('/Connection')}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Erreur</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={loadProfileData}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!progress || !userStats) {
    return null;
  }

  const progressPercentage = progress.xpToNextLevel > 0
    ? (progress.currentXp / (progress.currentXp + progress.xpToNextLevel)) * 100
    : 100;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            👤 Profil Bomb Party
          </h1>
          <p className="text-gray-300">
            {user.display_name || user.name}
          </p>
        </div>
        <button
          onClick={() => navigate('/bomb-party')}
          className="px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg text-purple-300 hover:from-purple-600/30 hover:to-blue-600/30 transition-all duration-300 flex items-center gap-2"
        >
          <span>←</span>
          <span>Retour</span>
        </button>
      </div>

      {/* Section Niveau et XP */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Niveau {progress.level}
            </h2>
            <p className="text-gray-300 text-sm">
              {progress.totalXp} XP total
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-300 text-sm mb-1">Prochain niveau</p>
            <p className="text-xl font-bold text-purple-300">
              {progress.xpToNextLevel} XP
            </p>
          </div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{progress.currentXp} XP</span>
          <span>{progress.currentXp + progress.xpToNextLevel} XP</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Statistiques principales */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">📊 Statistiques</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Parties jouées</span>
              <span className="text-white font-semibold">{userStats.totalMatches}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Victoires</span>
              <span className="text-green-400 font-semibold">{userStats.totalWins}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Taux de victoire</span>
              <span className="text-white font-semibold">{userStats.winRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Mots soumis</span>
              <span className="text-white font-semibold">{userStats.totalWordsSubmitted}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Mots valides</span>
              <span className="text-green-400 font-semibold">{userStats.totalValidWords}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Précision</span>
              <span className="text-white font-semibold">{userStats.accuracy.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Meilleur streak</span>
              <span className="text-yellow-400 font-semibold">{userStats.bestStreak}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Streak actuel</span>
              <span className="text-orange-400 font-semibold">{progress.streak}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Temps moyen</span>
              <span className="text-white font-semibold">
                {(userStats.averageResponseTime / 1000).toFixed(2)}s
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            🏅 Badges ({progress.badges.length})
          </h3>
          {progress.badges.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              Aucun badge débloqué pour le moment
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {progress.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`bg-gradient-to-br from-gray-700 to-gray-800 border-2 ${
                    RARITY_COLORS[badge.rarity] || 'border-gray-600'
                  } rounded-lg p-3 hover:scale-105 transition-transform`}
                >
                  <div className="text-3xl mb-2 text-center">{badge.icon}</div>
                  <div className="text-sm font-semibold text-white text-center mb-1">
                    {badge.name}
                  </div>
                  <div className="text-xs text-gray-400 text-center">
                    {badge.description}
                  </div>
                  {badge.unlockedAt && (
                    <div className="text-xs text-gray-500 text-center mt-2">
                      {new Date(badge.unlockedAt).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Récompenses débloquées */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
        <h3 className="text-xl font-bold text-white mb-4">🎁 Récompenses débloquées</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-purple-300 mb-3">Thèmes ({progress.unlockedThemes.length})</h4>
            {progress.unlockedThemes.length === 0 ? (
              <p className="text-gray-400">Aucun thème débloqué</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {progress.unlockedThemes.map((theme) => (
                  <span
                    key={theme}
                    className={`px-3 py-1 rounded-lg bg-purple-600/30 border border-purple-500/50 text-purple-200 ${
                      progress.currentTheme === theme ? 'ring-2 ring-purple-400' : ''
                    }`}
                  >
                    {theme}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-blue-300 mb-3">Avatars ({progress.unlockedAvatars.length})</h4>
            {progress.unlockedAvatars.length === 0 ? (
              <p className="text-gray-400">Aucun avatar débloqué</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {progress.unlockedAvatars.map((avatar) => (
                  <span
                    key={avatar}
                    className={`px-3 py-1 rounded-lg bg-blue-600/30 border border-blue-500/50 text-blue-200 ${
                      progress.currentAvatar === avatar ? 'ring-2 ring-blue-400' : ''
                    }`}
                  >
                    {avatar}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lien vers les statistiques détaillées */}
      <div className="text-center">
        <button
          onClick={() => navigate('/bomb-party/stats')}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition"
        >
          Voir les statistiques détaillées
        </button>
      </div>
    </div>
  );
}

