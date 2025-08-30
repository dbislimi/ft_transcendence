import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameConfig } from '../core/types';
import SpaceBackground from '../../Components/SpaceBackground';

interface MenuProps {
  onStart: (config: GameConfig) => void;
}

export default function Menu({ onStart }: MenuProps) {
  const { t } = useTranslation();
  const [playersCount, setPlayersCount] = useState<2 | 3 | 4 | 5 | 6 | 7 | 8>(2);

  const handleStart = () => {
    const config: GameConfig = {
      livesPerPlayer: 3,
      turnDurationMs: 15000,
      playersCount
    };
    onStart(config);
  };

  return (
    <SpaceBackground>
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
              💣 Bomb Party
            </h1>
            <p className="text-slate-300 text-lg">
              {t('bombParty.menu.subtitle')}
            </p>
          </div>

          <div className="space-y-6">
            {/* Sélection du nombre de joueurs */}
            <div className="space-y-3">
              <label className="block text-slate-300 text-sm font-medium">
                {t('bombParty.menu.playersCount')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                  <button
                    key={count}
                    onClick={() => setPlayersCount(count as 2 | 3 | 4 | 5 | 6 | 7 | 8)}
                    className={`py-3 px-2 rounded-lg border transition-all duration-200 text-sm ${
                      playersCount === count
                        ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Règles du jeu */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <h3 className="text-slate-200 font-medium mb-2">
                {t('bombParty.menu.rules.title')}
              </h3>
              <ul className="text-slate-400 text-sm space-y-1">
                <li>• {t('bombParty.menu.rules.rule1')}</li>
                <li>• {t('bombParty.menu.rules.rule2')}</li>
                <li>• {t('bombParty.menu.rules.rule3')}</li>
                <li>• {t('bombParty.menu.rules.rule4')}</li>
              </ul>
            </div>

            {/* Bouton de démarrage */}
            <button
              onClick={handleStart}
              className="w-full py-4 px-6 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {t('bombParty.menu.startGame')}
            </button>
          </div>
        </div>
      </div>
    </SpaceBackground>
  );
}