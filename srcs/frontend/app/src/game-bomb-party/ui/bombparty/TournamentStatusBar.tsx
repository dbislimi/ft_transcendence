import React from 'react';
import { useTranslation } from 'react-i18next';

interface TournamentStatusBarProps {
  currentRound: number | null;
  totalRounds: number;
  onViewBracket: () => void;
  onLeaveTournament: () => void;
}

export default function TournamentStatusBar({
  currentRound,
  totalRounds,
  onViewBracket,
  onLeaveTournament
}: TournamentStatusBarProps) {
  const { t } = useTranslation();

  const handleLeave = () => {
    if (window.confirm(t('bombParty.tournament.statusBar.confirmLeave', 'Êtes-vous sûr de vouloir quitter le tournoi ?'))) {
      onLeaveTournament();
    }
  };

  return (
    <div className="w-full bg-slate-800/90 backdrop-blur-md border-b border-purple-500/30 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-sm text-slate-300 font-medium">
              {t('bombParty.tournament.statusBar.inProgress', 'Tournoi en cours')}
            </span>
          </div>
          {currentRound !== null && (
            <div className="text-sm text-slate-400">
              {t('bombParty.tournament.statusBar.round', 'Tour {current} / {total}', { 
                current: currentRound, 
                total: totalRounds 
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onViewBracket}
            className="px-4 py-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 transition-all duration-200 text-sm font-medium"
          >
            {t('bombParty.tournament.statusBar.viewBracket', 'Voir le bracket')}
          </button>
          <button
            onClick={handleLeave}
            className="px-4 py-2 rounded-lg border border-red-500/50 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200 text-sm font-medium"
          >
            {t('bombParty.tournament.statusBar.leave', 'Quitter le tournoi')}
          </button>
        </div>
      </div>
    </div>
  );
}
