import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBombPartyStore } from '../../../store/useBombPartyStore';
import { bombPartyService } from '../../../services/bombPartyService';
import TournamentLobby from './TournamentLobby';
import TournamentBracket from './TournamentBracket';
import TournamentStatusBar from './TournamentStatusBar';
import PlayersCountDropdown from '../PlayersCountDropdown';
import SpaceBackground from '../../../Components/SpaceBackground';
import BackgroundSurface from '../../../Components/BackgroundSurface';
import { PlayerNameModal } from './index';
import { useAuth } from '../../../contexts/AuthContext';

type TournamentViewState = 
  | 'TOURNAMENT_SELECTION' 
  | 'TOURNAMENT_LOBBY' 
  | 'TOURNAMENT_IN_PROGRESS' 
  | 'TOURNAMENT_FINISHED';

export default function BombPartyTournamentView({
  onBack
}: {
  onBack?: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    tournamentId,
    tournaments,
    tournamentPlayers,
    tournamentCapacity,
    tournamentStatus,
    tournamentBracket,
    tournamentCurrentRound,
    tournamentWinner,
    connection
  } = useBombPartyStore();

  const [viewState, setViewState] = useState<TournamentViewState>('TOURNAMENT_SELECTION');
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [capacity, setCapacity] = useState(8);
  const [password, setPassword] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [countdown, setCountdown] = useState<number | undefined>(undefined);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [nameForcedThisVisit, setNameForcedThisVisit] = useState(false);
  const [showBracketModal, setShowBracketModal] = useState(false);
  const playerNameModalOpen = useBombPartyStore(s => s.playerNameModalOpen);
  const setPlayerNameModalOpen = useBombPartyStore(s => s.setPlayerNameModalOpen);
  const handlePlayerNameSubmit = (name: string) => {
    setPlayerNameModalOpen(false);
    bombPartyService.authenticateWithName(name);
    setNameForcedThisVisit(true);
  };

  // synchronise l'etat de la vue avec le statut du tournoi
  useEffect(() => {
    if (tournamentId) {
      if (tournamentStatus === 'WAITING') {
        setViewState('TOURNAMENT_LOBBY');
      } else if (tournamentStatus === 'IN_PROGRESS') {
        setViewState('TOURNAMENT_IN_PROGRESS');
      } else if (tournamentStatus === 'FINISHED') {
        setViewState('TOURNAMENT_FINISHED');
      }
    } else {
      setViewState('TOURNAMENT_SELECTION');
    }
  }, [tournamentId, tournamentStatus]);

  // Force picking a (new) player name in tournament flow, even if one exists in cache
  useEffect(() => {
    const store = useBombPartyStore.getState();
    const shouldGate = viewState === 'TOURNAMENT_SELECTION' || viewState === 'TOURNAMENT_LOBBY';
    const isAuthenticatedUser = !!user?.id; // utilisateur connecté via AuthContext
    if (shouldGate && connection.state === 'connected' && connection.playerId) {
      // Si l'utilisateur est authentifié (compte du site), ne pas forcer la saisie du nom
      if (isAuthenticatedUser) {
        // On peut éventuellement synchroniser le nom si besoin
        // Le BombPartyHooks s'occupe déjà d'utiliser user.name lors de l'auth WS
        if (store.playerNameModalOpen) {
          store.setPlayerNameModalOpen(false);
        }
        return;
      }

      // Sinon (guest), on force le choix du nom une seule fois par visite
      if (!nameForcedThisVisit && !store.playerNameModalOpen) {
        console.log('[TournamentView] Opening player name modal (guest flow)');
        store.setPlayerNameModalOpen(true);
      }
    }
  }, [viewState, connection.state, connection.playerId, nameForcedThisVisit, user?.id]);

  // Demander la liste des tournois au chargement
  useEffect(() => {
    if (connection.state === 'connected' && connection.playerId) {
      bombPartyService.listTournaments();
      const interval = setInterval(() => {
        bombPartyService.listTournaments();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [connection.state, connection.playerId]);

  // Demander le statut du tournoi si on est dans un tournoi
  useEffect(() => {
    if (tournamentId) {
      bombPartyService.getTournamentStatus(tournamentId);
      const interval = setInterval(() => {
        bombPartyService.getTournamentStatus(tournamentId);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [tournamentId]);

  const handleCreateTournament = () => {
    if (connection.state !== 'connected' || !connection.playerId || !capacity) {
      return;
    }
    bombPartyService.createTournament(capacity, isPrivate ? password : undefined);
  };

  const handleJoinClick = (tournamentIdToJoin: string, isPrivateTournament: boolean) => {
    if (isPrivateTournament) {
      setSelectedTournamentId(tournamentIdToJoin);
      setJoinPassword('');
    } else {
      handleJoinTournament(tournamentIdToJoin);
    }
  };

  const handleJoinTournament = (tournamentIdToJoin: string, passwordToUse?: string) => {
    if (connection.state !== 'connected' || !connection.playerId) {
      return;
    }
    bombPartyService.joinTournament(tournamentIdToJoin, passwordToUse);
    setSelectedTournamentId(null);
    setJoinPassword('');
  };

  const handlePasswordSubmit = () => {
    if (selectedTournamentId && joinPassword.trim()) {
      handleJoinTournament(selectedTournamentId, joinPassword);
    }
  };

  const handleCancelPassword = () => {
    setSelectedTournamentId(null);
    setJoinPassword('');
  };

  const handleLeaveTournament = () => {
    if (tournamentId) {
      bombPartyService.leaveTournament(tournamentId);
      setViewState('TOURNAMENT_SELECTION');
      setSelectedTournamentId(null);
      setJoinPassword('');
    }
  };

  const handleJoinMatch = (roomId: string) => {
    window.location.href = `/bomb-party?room=${roomId}`;
  };

  const handleToggleReady = (matchId: string, ready: boolean) => {
    if (!tournamentId) return;
    bombPartyService.setMatchReady(tournamentId, matchId, ready);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    bombPartyService.listTournaments();
    setTimeout(() => setIsLoading(false), 1000);
  };

  // vue de selection (creer/rejoindre)
  if (viewState === 'TOURNAMENT_SELECTION') {
    return (
      <BackgroundSurface game="bombparty">
        <SpaceBackground />
        <PlayerNameModal isOpen={playerNameModalOpen} onSubmit={handlePlayerNameSubmit} />
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                {t('bombParty.tournament.title', 'Tournoi BombParty')}
              </h1>
              <div className="flex items-center gap-2">
                {/* Indicateur de connexion */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connection.state === 'connected' ? 'bg-green-400' :
                    connection.state === 'connecting' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`}></div>
                  <span className="text-xs text-slate-400">
                    {connection.state === 'connected' ? t('bombParty.lobby.connected', 'Connecté') :
                     connection.state === 'connecting' ? t('bombParty.lobby.connecting', 'Connexion...') :
                     t('bombParty.lobby.disconnected', 'Déconnecté')}
                  </span>
                </div>
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-white transition-all duration-200"
                    aria-label={t('common.backAria', 'Retour')}
                  >
                    {t('common.back', 'Retour')}
                  </button>
                )}
              </div>
            </div>

            {/* Affichage des erreurs */}
            {connection.lastError && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 text-sm">
                {connection.lastError}
              </div>
            )}

            {/* Onglets */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setTab('create')}
                className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                  tab === 'create' 
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-400/10' 
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                {t('bombParty.tournament.createTab', 'Créer un tournoi')}
              </button>
              <button
                type="button"
                onClick={() => setTab('join')}
                className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                  tab === 'join' 
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-400/10' 
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                {t('bombParty.tournament.joinTab', 'Rejoindre un tournoi')}
              </button>
            </div>

            {tab === 'create' ? (
              <div className="space-y-4">
                <PlayersCountDropdown
                  value={capacity}
                  onChange={setCapacity}
                  options={[4, 6, 8, 10, 12, 16, 32]}
                  label={t('bombParty.tournament.capacity', 'Capacité (nombre de joueurs)')}
                />
                <div className="flex items-center gap-2">
                  <input
                    id="isPrivateTournament"
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700/60 text-cyan-500 focus:ring-cyan-400"
                  />
                  <label htmlFor="isPrivateTournament" className="text-slate-300 cursor-pointer">
                    {t('bombParty.lobby.private', 'Tournoi privé')}
                  </label>
                </div>
                {isPrivate && (
                  <div>
                    <label className="block text-slate-300 text-sm mb-1">
                      {t('bombParty.lobby.password', 'Mot de passe')}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white focus:outline-none focus:border-cyan-400 transition-colors"
                      placeholder={t('bombParty.lobby.enterPassword', 'Entrez un mot de passe')}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleCreateTournament}
                  disabled={connection.state !== 'connected' || !connection.playerId || !capacity}
                  className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-200 ${
                    connection.state === 'connected' && connection.playerId && capacity
                      ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {connection.state !== 'connected' || !connection.playerId ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {connection.state === 'connecting' 
                        ? t('bombParty.lobby.connecting', 'Connexion...') 
                        : t('bombParty.lobby.connectionRequired', 'Connexion requise')}
                    </div>
                  ) : (
                    t('bombParty.tournament.create', 'Créer le tournoi')
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-200">
                    {t('bombParty.tournament.available', 'Tournois disponibles')} ({tournaments.length})
                  </h2>
                  <button
                    onClick={handleRefresh}
                    disabled={isLoading || connection.state !== 'connected'}
                    className="px-3 py-1 text-sm rounded border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-50 transition-all duration-200"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      t('bombParty.lobby.refresh', 'Actualiser')
                    )}
                  </button>
                </div>

                {connection.state !== 'connected' || !connection.playerId ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-400">
                        {connection.state === 'connecting' 
                          ? t('bombParty.lobby.connecting', 'Connexion...') 
                          : t('bombParty.lobby.connectionRequired', 'Connexion requise')}
                      </p>
                    </div>
                  </div>
                ) : tournaments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-2">{t('bombParty.tournament.noTournaments', 'Aucun tournoi disponible')}</p>
                    <p className="text-sm text-slate-500">{t('bombParty.tournament.noTournamentsDesc', 'Créez-en un ou attendez qu\'un autre joueur en crée un')}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {tournaments.map((tournament) => {
                      const canJoin = tournament.status === 'WAITING' && 
                                     tournament.currentPlayers < tournament.capacity &&
                                     connection.state === 'connected' && 
                                     connection.playerId;
                      const isSelected = selectedTournamentId === tournament.id;

                      return (
                        <div
                          key={tournament.id}
                          className={`p-4 rounded-lg border transition-all duration-200 ${
                            canJoin
                              ? 'border-slate-600 bg-slate-700/60 hover:border-slate-500 hover:bg-slate-700/80'
                              : 'border-slate-600 bg-slate-700/30 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-slate-200">
                                {t('bombParty.tournament.tournament', 'Tournoi')} {tournament.capacity} {t('bombParty.tournament.players', 'joueurs')}
                              </h4>
                              {tournament.isPrivate && (
                                <span className="px-2 py-1 text-xs rounded bg-purple-600/20 text-purple-300 border border-purple-500/30">
                                  {t('bombParty.lobby.private', 'Privé')}
                                </span>
                              )}
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                tournament.status === 'IN_PROGRESS' 
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : tournament.status === 'FINISHED'
                                  ? 'bg-gray-500/20 text-gray-300'
                                  : 'bg-green-500/20 text-green-300'
                              }`}>
                                {tournament.status === 'IN_PROGRESS' 
                                  ? t('bombParty.tournament.inProgress', 'En cours')
                                  : tournament.status === 'FINISHED'
                                  ? t('bombParty.tournament.finished', 'Terminé')
                                  : t('bombParty.tournament.waiting', 'En attente')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                            <span>
                              {tournament.currentPlayers}/{tournament.capacity} {t('bombParty.tournament.players', 'joueurs')}
                            </span>
                          </div>
                          {canJoin && (
                            <div className="flex gap-2">
                              {tournament.isPrivate && (
                                <input
                                  type="password"
                                  placeholder={t('bombParty.lobby.password', 'Mot de passe')}
                                  value={isSelected ? joinPassword : ''}
                                  onChange={(e) => {
                                    setJoinPassword(e.target.value);
                                    setSelectedTournamentId(tournament.id);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && joinPassword.trim()) {
                                      handlePasswordSubmit();
                                    }
                                  }}
                                  className="flex-1 px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white text-sm focus:outline-none focus:border-cyan-400 transition-colors"
                                />
                              )}
                              <button
                                onClick={() => handleJoinClick(tournament.id, tournament.isPrivate)}
                                disabled={tournament.isPrivate && (!isSelected || !joinPassword.trim())}
                                className={`px-4 py-2 rounded font-medium transition-all duration-200 ${
                                  tournament.isPrivate && (!isSelected || !joinPassword.trim())
                                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white'
                                }`}
                              >
                                {t('bombParty.lobby.join', 'Rejoindre')}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Modal pour mot de passe */}
            {selectedTournamentId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg border border-purple-500/30 p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">
                    {t('bombParty.lobby.joinPrivate', 'Rejoindre un tournoi privé')}
                  </h3>
                  <p className="text-slate-400 mb-4">
                    {t('bombParty.lobby.privatePasswordDesc', 'Ce tournoi nécessite un mot de passe pour y accéder.')}
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">
                        {t('bombParty.lobby.password', 'Mot de passe')}
                      </label>
                      <input
                        type="password"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        placeholder={t('bombParty.lobby.enterPassword', 'Entrez le mot de passe')}
                        className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white focus:outline-none focus:border-cyan-400 transition-colors"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && joinPassword.trim()) {
                            handlePasswordSubmit();
                          } else if (e.key === 'Escape') {
                            handleCancelPassword();
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePasswordSubmit}
                        disabled={!joinPassword.trim()}
                        className={`flex-1 py-2 px-4 rounded font-medium transition-all duration-200 ${
                          joinPassword.trim()
                            ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white'
                            : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {t('bombParty.lobby.join', 'Rejoindre')}
                      </button>
                      <button
                        onClick={handleCancelPassword}
                        className="px-4 py-2 rounded border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 transition-all duration-200"
                      >
                        {t('bombParty.lobby.cancel', 'Annuler')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </BackgroundSurface>
    );
  }

  // Vue du lobby d'attente
  if (viewState === 'TOURNAMENT_LOBBY') {
    return (
      <BackgroundSurface game="bombparty">
        <SpaceBackground />
        <PlayerNameModal isOpen={playerNameModalOpen} onSubmit={handlePlayerNameSubmit} />
        <TournamentLobby
          players={tournamentPlayers}
          capacity={tournamentCapacity}
          onLeave={handleLeaveTournament}
          countdown={countdown}
        />
      </BackgroundSurface>
    );
  }

  // Vue du bracket pendant le tournoi
  if (viewState === 'TOURNAMENT_IN_PROGRESS' && tournamentBracket) {
    console.log('[TournamentView] Rendering IN_PROGRESS view', {
      bracket: tournamentBracket,
      matchCount: tournamentBracket.matches?.length,
      rounds: tournamentBracket.rounds,
      currentRound: tournamentCurrentRound
    });

    return (
      <BackgroundSurface game="bombparty">
        <SpaceBackground />
        <div className="min-h-screen">
          <TournamentStatusBar
            currentRound={tournamentCurrentRound}
            totalRounds={tournamentBracket.rounds}
            onViewBracket={() => setShowBracketModal(true)}
            onLeaveTournament={handleLeaveTournament}
          />
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 shadow-2xl">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-6">
                  {t('bombParty.tournament.bracketTitle', 'Bracket du Tournoi')}
                </h1>
                
                {/* Informations du tournoi */}
                <div className="mb-6 p-4 bg-slate-700/40 rounded-lg border border-slate-600">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-slate-400">
                        {t('bombParty.tournament.lobby.players', 'Joueurs')}: 
                        <span className="ml-2 text-white font-semibold">{tournamentPlayers.length}/{tournamentCapacity}</span>
                      </span>
                      <span className="text-slate-400">
                        {t('bombParty.tournament.statusBar.round', 'Tour {current} / {total}', { 
                          current: tournamentCurrentRound || 1, 
                          total: tournamentBracket.rounds 
                        })}
                      </span>
                      <span className="text-slate-400">
                        {t('bombParty.tournament.match.total', 'Matchs')}: 
                        <span className="ml-2 text-white font-semibold">{tournamentBracket.matches?.length || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <TournamentBracket
                  bracket={tournamentBracket}
                  currentRound={tournamentCurrentRound}
                  onJoinMatch={handleJoinMatch}
                  currentPlayerId={connection.playerId}
                  onToggleReady={handleToggleReady}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bracket en plein écran */}
        {showBracketModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/95 backdrop-blur-md rounded-2xl border border-purple-500/30 w-full max-w-7xl max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  {t('bombParty.tournament.bracketTitle', 'Bracket du Tournoi')}
                </h2>
                <button
                  onClick={() => setShowBracketModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 transition-all duration-200"
                >
                  {t('common.close', 'Fermer')}
                </button>
              </div>
              <div className="p-6 overflow-auto max-h-[calc(90vh-100px)]">
                <TournamentBracket
                  bracket={tournamentBracket}
                  currentRound={tournamentCurrentRound}
                  onJoinMatch={handleJoinMatch}
                  currentPlayerId={connection.playerId}
                  onToggleReady={handleToggleReady}
                />
              </div>
            </div>
          </div>
        )}
      </BackgroundSurface>
    );
  }

  // Vue de fin de tournoi
  if (viewState === 'TOURNAMENT_FINISHED') {
    return (
      <BackgroundSurface game="bombparty">
        <SpaceBackground />
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-4xl w-full shadow-2xl">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
                {t('bombParty.tournament.finished', 'Tournoi Terminé !')}
              </h1>
              {tournamentWinner && (
                <div className="mb-6">
                  <p className="text-slate-300 mb-2">{t('bombParty.tournament.winner', 'Le gagnant est :')}</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {tournamentWinner.name}
                  </p>
                </div>
              )}
            </div>
            {tournamentBracket && (
              <div className="mb-6">
                <TournamentBracket
                  bracket={tournamentBracket}
                  currentRound={null}
                  currentPlayerId={connection.playerId}
                />
              </div>
            )}
            <div className="flex justify-center">
              <button
                onClick={handleLeaveTournament}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {t('bombParty.tournament.backToMenu', 'Retour au menu')}
              </button>
            </div>
          </div>
        </div>
      </BackgroundSurface>
    );
  }

  return null;
}
