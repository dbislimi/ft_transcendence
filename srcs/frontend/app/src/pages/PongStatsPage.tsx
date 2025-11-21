import React from 'react';
import { useTranslation } from 'react-i18next';

export default function PongStatsPage() {
  const { t } = useTranslation();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          📊 Statistiques Pong
        </h1>
        <p className="text-gray-300">
          Les statistiques du jeu Pong seront disponibles prochainement.
        </p>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-600/30">
        <div className="text-6xl mb-4">🏓</div>
        <p className="text-gray-300 text-lg">
          Page en cours de développement
        </p>
      </div>
    </div>
  );
}

