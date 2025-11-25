import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SpaceBackground from '../Components/SpaceBackground';
import BombPartyStatsContainer from '../Components/bombparty/BombPartyStatsContainer';
import PongStatsPage from './PongStatsPage';
import { useTranslation } from 'react-i18next';

type GameType = 'bombparty' | 'pong';

export default function StatsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState<GameType>('bombparty');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  return (
    <>
      <SpaceBackground />
      <div className={`relative min-h-screen overflow-hidden transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">

          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 mb-8 shadow-2xl">
            <div className="flex justify-center p-2">
              <button
                onClick={() => setSelectedGame('bombparty')}
                className={`flex-1 max-w-xs px-6 py-4 font-semibold transition-all duration-300 rounded-xl m-2 ${
                  selectedGame === 'bombparty'
                    ? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/50 text-purple-200"
                    : "text-gray-400 hover:text-gray-200 hover:bg-slate-700/50 opacity-50 cursor-not-allowed"
                }`}
                disabled={selectedGame !== 'bombparty'}
              >
                <span className="mr-2 inline-flex">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                  </svg>
                </span>
                Bomb Party
              </button>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
            {selectedGame === 'bombparty' ? (
              <BombPartyStatsContainer />
            ) : (
              <PongStatsPage />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
