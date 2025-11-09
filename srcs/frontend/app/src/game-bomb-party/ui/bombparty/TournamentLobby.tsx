import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SpaceBackground from '../../../Components/SpaceBackground';
import BackgroundSurface from '../../../Components/BackgroundSurface';

interface TournamentLobbyProps {
  players: Array<{ id: string; name: string }>;
  capacity: number;
  onLeave: () => void;
  countdown?: number;
}

export default function TournamentLobby({
  players,
  capacity,
  onLeave,
  countdown
}: TournamentLobbyProps) {
  const { t } = useTranslation();
  const [showCountdown, setShowCountdown] = useState(false);

  useEffect(() => {
    if (countdown !== undefined && countdown > 0) {
      setShowCountdown(true);
    } else if (countdown === 0) {
      setShowCountdown(false);
    }
  }, [countdown]);

  const remainingSlots = capacity - players.length;

  return (
    <BackgroundSurface game="bombparty">
      <SpaceBackground />
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-2xl w-full shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              {t('bombParty.tournament.lobby.title', 'Lobby du Tournoi')}
            </h1>
            <button
              onClick={onLeave}
              className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 transition-all duration-200"
            >
              {t('bombParty.players.leave', 'Quitter')}
            </button>
          </div>

          {/* Compteur de joueurs */}
          <div className="mb-6 p-4 rounded-lg bg-slate-700/50 border border-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">{t('bombParty.tournament.lobby.playersRegistered', 'Joueurs inscrits')}</span>
              <span className="text-xl font-bold text-cyan-400">
                {players.length} / {capacity}
              </span>
            </div>
          </div>

          {/* Message d'attente ou countdown */}
          {showCountdown && countdown !== undefined && countdown > 0 ? (
            <div className="mb-6 text-center">
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
                {countdown}
              </div>
              <p className="text-slate-300">{t('bombParty.tournament.lobby.starting', 'Démarrage du tournoi...')}</p>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-yellow-400 text-center">
                {remainingSlots > 0
                  ? t('bombParty.tournament.lobby.waitingForPlayers', 'En attente de {count} joueur(s)...', { count: remainingSlots })
                  : t('bombParty.tournament.lobby.startingSoon', 'Le tournoi va démarrer bientôt !')}
              </p>
            </div>
          )}

          {/* Liste des joueurs */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-300 mb-4">
              {t('bombParty.tournament.lobby.registeredPlayers', 'Joueurs inscrits')}
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {players.length === 0 ? (
                <p className="text-slate-500 text-center py-4">{t('bombParty.tournament.lobby.noPlayers', 'Aucun joueur inscrit')}</p>
              ) : (
                players.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <span className="text-slate-300">{player.name}</span>
                    </div>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                      {t('bombParty.tournament.lobby.ready', 'Prêt')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Slots vides */}
          {remainingSlots > 0 && (
            <div className="space-y-2">
              {Array.from({ length: remainingSlots }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="p-3 rounded-lg bg-slate-800/40 border border-slate-700 border-dashed flex items-center justify-center"
                >
                  <span className="text-slate-500 text-sm">{t('bombParty.tournament.lobby.waiting', 'En attente...')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BackgroundSurface>
  );
}
