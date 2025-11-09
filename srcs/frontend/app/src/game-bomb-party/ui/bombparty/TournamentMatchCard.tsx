import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TournamentMatch } from '../../../store/useBombPartyStore';

interface TournamentMatchCardProps {
  match: TournamentMatch;
  isCurrentRound?: boolean;
  onJoinMatch?: (roomId: string) => void;
  currentPlayerId?: string | null;
  onToggleReady?: (matchId: string, ready: boolean) => void;
}

export default function TournamentMatchCard({
  match,
  isCurrentRound = false,
  onJoinMatch,
  currentPlayerId,
  onToggleReady
}: TournamentMatchCardProps) {
  const { t } = useTranslation();

  const getStatusColor = () => {
    switch (match.status) {
      case 'WAITING':
        return 'border-slate-600 bg-slate-700/30';
      case 'IN_PROGRESS':
        return 'border-cyan-400 bg-cyan-900/20 ring-2 ring-cyan-400/30';
      case 'FINISHED':
        return 'border-green-500/50 bg-green-900/10';
      default:
        return 'border-slate-600 bg-slate-700/30';
    }
  };

  const getStatusText = () => {
    switch (match.status) {
      case 'WAITING':
        return t('bombParty.tournament.match.waiting', 'En attente');
      case 'IN_PROGRESS':
        return t('bombParty.tournament.match.inProgress', 'En cours');
      case 'FINISHED':
        return t('bombParty.tournament.match.finished', 'Terminé');
      default:
        return '';
    }
  };

  const isPlayerInMatch = currentPlayerId && (
    match.player1?.id === currentPlayerId || match.player2?.id === currentPlayerId
  );
  const playerReady = isPlayerInMatch && match.readyPlayers?.includes(currentPlayerId!);
  const p1Ready = match.player1?.id ? !!match.readyPlayers?.includes(match.player1.id) : false;
  const p2Ready = match.player2?.id ? !!match.readyPlayers?.includes(match.player2.id) : false;
  
  // bothReady est true seulement si les deux joueurs sont présents ET les deux sont prêts
  // On vérifie que les deux joueurs du match sont bien dans readyPlayers
  const bothReady = match.player1 && match.player2 && 
                    match.readyPlayers && 
                    match.readyPlayers.length >= 2 &&
                    match.readyPlayers.includes(match.player1.id) &&
                    match.readyPlayers.includes(match.player2.id);
  
  // Debug log pour comprendre pourquoi le bouton disparaît
  if (match.status === 'WAITING' && isPlayerInMatch && isCurrentRound) {
    console.log('[TournamentMatchCard] Match ready state:', {
      matchId: match.id,
      status: match.status,
      isCurrentRound,
      isPlayerInMatch,
      playerReady,
      bothReady,
      readyPlayers: match.readyPlayers,
      readyPlayersLength: match.readyPlayers?.length,
      player1: match.player1?.id,
      player2: match.player2?.id,
      p1Ready,
      p2Ready
    });
  }

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all duration-200 ${getStatusColor()} ${
        isCurrentRound ? 'ring-2 ring-purple-400/50' : ''
      } ${isPlayerInMatch ? 'border-cyan-400/60' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 font-medium">
          {t('bombParty.tournament.match.round', 'Tour')} {match.round}
        </span>
        <span className={`text-xs px-2 py-1 rounded font-medium ${
          match.status === 'IN_PROGRESS' 
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
            : match.status === 'FINISHED' 
            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
            : 'bg-slate-700 text-slate-400 border border-slate-600'
        }`}>
          {getStatusText()}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-2 rounded bg-slate-800/40">
          <span className={`text-sm font-medium ${
            match.player1 ? 'text-white' : 'text-slate-500 italic'
          }`}>
            {match.player1?.name || t('bombParty.tournament.match.tbd', 'TBD')}
            {currentPlayerId === match.player1?.id && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                {t('bombParty.tournament.match.you', 'Vous')}
              </span>
            )}
          </span>
          <span className={`ml-2 w-2 h-2 rounded-full ${p1Ready ? 'bg-green-400' : 'bg-slate-500'}`} title={p1Ready ? t('bombParty.tournament.match.ready','Prêt') : t('bombParty.tournament.match.notReady','Pas prêt')}></span>
          {match.winner?.id === match.player1?.id && (
            <span className="text-green-400 text-lg font-bold">✓</span>
          )}
        </div>

        <div className="text-center text-slate-500 text-xs font-medium">{t('bombParty.tournament.match.vs', 'VS')}</div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-800/40">
          <span className={`text-sm font-medium ${
            match.player2 ? 'text-white' : 'text-slate-500 italic'
          }`}>
            {match.player2?.name || t('bombParty.tournament.match.tbd', 'TBD')}
            {currentPlayerId === match.player2?.id && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                {t('bombParty.tournament.match.you', 'Vous')}
              </span>
            )}
          </span>
          <span className={`ml-2 w-2 h-2 rounded-full ${p2Ready ? 'bg-green-400' : 'bg-slate-500'}`} title={p2Ready ? t('bombParty.tournament.match.ready','Prêt') : t('bombParty.tournament.match.notReady','Pas prêt')}></span>
          {match.winner?.id === match.player2?.id && (
            <span className="text-green-400 text-lg font-bold">✓</span>
          )}
        </div>
      </div>

      {/* Afficher le bouton de confirmation tant que le match est en WAITING, c'est le round actuel, le joueur est dans le match, et les deux joueurs ne sont pas prêts */}
      {match.status === 'WAITING' && isCurrentRound && isPlayerInMatch && !bothReady && onToggleReady && (
        <div className="mt-4">
          {!playerReady ? (
            <button
              onClick={() => onToggleReady(match.id, true)}
              className="w-full py-2 px-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {t('bombParty.tournament.match.confirm', 'Confirmer prêt')}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-center text-xs text-cyan-300">
                {t('bombParty.tournament.match.waitingOpponent', "En attente de l'adversaire...")}
              </div>
              <button
                onClick={() => onToggleReady(match.id, false)}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {t('bombParty.tournament.match.cancel', 'Annuler')}
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Message informatif si le match est en attente mais que ce n'est pas le round actuel */}
      {match.status === 'WAITING' && !isCurrentRound && isPlayerInMatch && (
        <div className="mt-4 text-center text-xs text-slate-400">
          {t('bombParty.tournament.match.waitingRound', 'En attente du tour {round}', { round: match.round })}
        </div>
      )}

      {match.status === 'IN_PROGRESS' && match.roomId && isPlayerInMatch && onJoinMatch && (
        <button
          onClick={() => onJoinMatch(match.roomId!)}
          className="mt-4 w-full py-2 px-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {t('bombParty.tournament.match.join', 'Rejoindre le match')}
        </button>
      )}

      {match.status === 'FINISHED' && match.winner && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-center">
            <span className="text-xs text-slate-400">{t('bombParty.tournament.match.winner', 'Gagnant')}:</span>
            <div className="text-sm font-semibold text-green-400 mt-1">
              {match.winner.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
