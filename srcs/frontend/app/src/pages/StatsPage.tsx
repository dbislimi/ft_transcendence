import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SpaceBackground from '../Components/SpaceBackground';
import BombPartyStatsContainer from '../Components/bombparty/BombPartyStatsContainer';
import PongStatsPage from './PongStatsPage';

type GameType = 'bombparty' | 'pong';

export default function StatsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Déterminer le jeu actuel depuis l'URL ou par défaut bombparty
  const getCurrentGame = (): GameType => {
    if (location.pathname.includes('/stats/pong')) return 'pong';
    if (location.pathname.includes('/stats/bombparty')) return 'bombparty';
    return 'bombparty'; // Par défaut
  };

  const [selectedGame, setSelectedGame] = useState<GameType>(getCurrentGame());

  // Mettre à jour le jeu sélectionné quand l'URL change
  useEffect(() => {
    // Rediriger vers /stats/bombparty si on est sur /stats sans spécifier le jeu
    if (location.pathname === '/stats') {
      navigate('/stats/bombparty', { replace: true });
      return;
    }
    const currentGame = getCurrentGame();
    setSelectedGame(currentGame);
  }, [location.pathname, navigate]);

  // Animation d'entrée
  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  const handleGameChange = (game: GameType) => {
    setSelectedGame(game);
    if (game === 'pong') {
      navigate('/stats/pong');
    } else {
      navigate('/stats/bombparty');
    }
  };

  return (
    <>
      <SpaceBackground />
      <div className="relative min-h-screen overflow-hidden">
        <div className={`relative z-10 min-h-screen transition-all duration-1000 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            
            {/* Sélecteur de jeu sous le header */}
            <div className="bg-gradient-to-r from-slate-800/80 via-purple-900/80 to-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/20 p-6 mb-8 shadow-2xl">
              <div className="flex gap-4 justify-center items-center">
                <button
                  onClick={() => handleGameChange('bombparty')}
                  className={`w-48 py-3 text-lg rounded-lg font-semibold transition-all duration-300 ${
                    selectedGame === 'bombparty'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/50'
                  }`}
                >
                  Bomb Party
                </button>
                <button
                  onClick={() => handleGameChange('pong')}
                  className={`w-48 py-3 text-lg rounded-lg font-semibold transition-all duration-300 ${
                    selectedGame === 'pong'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/50'
                  }`}
                >
                  Pong
                </button>
              </div>
            </div>

            {/* Contenu des statistiques */}
            <div className="bg-gradient-to-r from-slate-800/80 via-purple-900/80 to-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/20 shadow-2xl">
              {selectedGame === 'bombparty' ? (
                <div className="p-8">
                  <BombPartyStatsContainer />
                </div>
              ) : (
                <PongStatsPage />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

