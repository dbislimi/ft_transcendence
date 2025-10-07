import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BombPartyEngine } from '../core/engine';
import { TurnTimer, useTurnTimer } from '../core/timer';
import type { GameConfig, BonusKey } from '../core/types';
import { debugDictionary } from '../data/validator';
import { BombPartyClient } from '../../services/ws/bombPartyClient';
import Menu from './Menu';
import PlayerCircle from './PlayerCircle';
import BombTimer from './BombTimer';
import WordInput from './WordInput';
import Countdown from './Countdown';
import RulesScreen from '../RulesScreen';
import LobbyScreen from './LobbyScreen';
import PlayersScreen from './PlayersScreen';
import Chat from '../../Components/Chat';
import BombPartyInfoSidebar from '../../Components/BombPartyInfoSidebar';
import PlayerProfileModal from '../../Components/PlayerProfileModal';
import BackgroundSurface from '../../Components/BackgroundSurface';
import SpaceBackground from '../../Components/SpaceBackground';

// Flag pour activer/desactiver les suggestions des mots
const SUGGESTIONS_ENABLED = true;

export default function BombPartyPage() {
  const { t } = useTranslation();
  const [gamePhase, setGamePhase] = useState<'RULES' | 'LOBBY' | 'PLAYERS' | 'GAME' | 'GAME_OVER'>('RULES');
  const [gameMode, setGameMode] = useState<'local' | 'multiplayer'>('local');
  const [engine] = useState(() => new BombPartyEngine());
  const [timer] = useState(() => new TurnTimer());
  const [client] = useState(() => new BombPartyClient());
  const [countdown, setCountdown] = useState(3);
  const [gameState, setGameState] = useState(engine.getState());
  const [wordJustSubmitted, setWordJustSubmitted] = useState(false);
  const [turnInProgress, setTurnInProgress] = useState(false);
  const [timerGracePeriod, setTimerGracePeriod] = useState(false);
  const [turnStartTime, setTurnStartTime] = useState(0);
  const [timerFlash, setTimerFlash] = useState(false);
  const [profilePlayerId, setProfilePlayerId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<Array<{id: string; name: string}>>([]);
  const [isHost, setIsHost] = useState(false);
  const [lobbyMaxPlayers, setLobbyMaxPlayers] = useState(4);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // Timer pour le mode multijoueur
  const isMultiplayerTimerActive = gameState.phase === 'TURN_ACTIVE' && gameMode === 'multiplayer';
  const multiplayerRemainingMs = useTurnTimer(timer, isMultiplayerTimerActive);
  
  // Timer pour le mode local (utilise l'engine)
  const localRemainingMs = gameMode === 'local' && gameState.phase === 'TURN_ACTIVE' ? Math.max(0, (gameState.turnEndsAt || 0) - performance.now()) : 0;
  const remainingMs = gameMode === 'local' ? localRemainingMs : multiplayerRemainingMs;
  
  // Debug timer (désactivé en production pour améliorer les performances)
  // useEffect(() => {
  //   if (gameMode === 'multiplayer' && gameState.phase === 'TURN_ACTIVE') {
  //     console.log('🕐 Timer multijoueur - remainingMs:', remainingMs, 'isTimerActive:', timer.isTimerActive());
  //   }
  // }, [gameMode, gameState.phase, remainingMs, timer]);

  // Force re-render pour le timer local (réduit la fréquence pour améliorer les performances)
  const [, forceUpdate] = useState({});
  useEffect(() => {
    if (gameMode === 'local' && gameState.phase === 'TURN_ACTIVE') {
      const interval = setInterval(() => {
        forceUpdate({});
      }, 200); // Réduit de 100ms à 200ms
      return () => clearInterval(interval);
    }
  }, [gameMode, gameState.phase]);

  const handleRulesContinue = useCallback(() => setGamePhase('LOBBY'), []);

  const handleLobbyCreate = useCallback((meta: { name: string; isPrivate: boolean; password?: string; maxPlayers: number; }) => {
    if (!playerId) {
      return;
    }
    
    console.log('🎯 [Frontend-BombPartyPage] handleLobbyCreate reçu meta.maxPlayers:', meta.maxPlayers);
    client.createLobby(meta.name, meta.isPrivate, meta.password, meta.maxPlayers);
  }, [client, playerId]);

  const handleLobbyJoin = useCallback((roomId: string, password?: string) => {
    client.joinLobby(roomId, password);
  }, [client]);

  const handleBackFromLobby = useCallback(() => setGamePhase('RULES'), []);

  const handleLeaveLobby = useCallback(() => {
    if (roomId) {
      client.sendMessage({
        event: 'bp:lobby:leave',
        payload: { roomId }
      });
    }
    setGamePhase('RULES');
    setLobbyPlayers([]);
    setIsHost(false);
  }, [client, roomId]);

  const startGame = useCallback((config: GameConfig) => {
    console.log('🎮 startGame appelé avec config:', config);
    
    if (gameMode === 'local') {
      // Mode local : démarrer directement avec l'engine
      engine.startGame(config);
      setGameState(engine.getState());
      setGamePhase('GAME');
      setCountdown(0);
    } else {
      // Mode multijoueur : envoyer au serveur
      if (!roomId) {
        console.log('❌ Pas de roomId pour démarrer le jeu');
        return;
      }
      console.log('🎮 Envoi bp:lobby:start au serveur');
      client.startGame(roomId);
    }
  }, [client, roomId, gameMode, engine]);

  const handleStartGame = useCallback(() => {
    console.log('🎮 handleStartGame appelé');
    startGame({ livesPerPlayer: 3, turnDurationMs: 15000, playersCount: lobbyPlayers.length });
  }, [startGame, lobbyPlayers.length]);

  // Gestionnaires d'événements WebSocket
  useEffect(() => {
    const handleAuthSuccess = (payload: any) => {
      console.log('✅ [BombParty] Authentification réussie:', payload);
      setPlayerId(payload.playerId);
      setIsAuthenticating(false);
    };

    const handleConnectionError = () => {
      console.error('❌ [BombParty] Erreur de connexion WebSocket');
      setIsAuthenticating(false); // Permettre de créer un lobby même en cas d'erreur
    };

    const handleLobbyCreated = (payload: any) => {
      setRoomId(payload.roomId);
      setLobbyMaxPlayers(payload.maxPlayers || 4);
      setIsHost(true);
      setGamePhase('PLAYERS');
    };

    const handleLobbyJoined = (payload: any) => {
      setRoomId(payload.roomId);
      setLobbyMaxPlayers(payload.maxPlayers || 4);
      setLobbyPlayers(payload.players || []);
      setIsHost(false);
      setGamePhase('PLAYERS');
    };

    const handlePlayerJoined = (payload: any) => {
      console.log('👋 Joueur rejoint:', payload);
      setLobbyPlayers(payload.players || []);
    };

    const handlePlayerLeft = (payload: any) => {
      setLobbyPlayers(payload.players || []);
    };

    const handleGameState = (payload: any) => {
      console.log('🎮 handleGameState reçu:', payload);
      console.log('📊 État du jeu:', {
        phase: payload.gameState.phase,
        currentPlayerIndex: payload.gameState.currentPlayerIndex,
        players: payload.gameState.players.map((p: any) => ({ id: p.id, name: p.name })),
        currentTrigram: payload.gameState.currentTrigram,
        baseTurnSeconds: payload.gameState.baseTurnSeconds
      });
      
      setGameState(payload.gameState);
      
      // Ne pas forcer le retour au jeu si la partie est terminée
      if (payload.gameState.phase !== 'GAME_OVER') {
        setGamePhase('GAME'); // Passer à l'écran de jeu seulement si la partie continue
      }
      setCountdown(0); // Arrêter le décompte de démarrage
      
      // Réinitialiser les flags pour permettre la prochaine soumission
      setWordJustSubmitted(false);
      setTurnInProgress(false);
      
      if (payload.gameState.phase === 'TURN_ACTIVE') {
        console.log('⏱️ Démarrage du timer:', payload.gameState.baseTurnSeconds * 1000, 'ms');
        timer.startTurn(payload.gameState.baseTurnSeconds * 1000);
        setTurnStartTime(performance.now());
        setTimerGracePeriod(true);
        setTimeout(() => setTimerGracePeriod(false), 5000);
      }
    };

    const handleGameEnd = (payload: any) => {
      console.log('🏁 [BombParty] Fin de partie reçue:', payload);
      
      // Mettre à jour l'état du jeu pour marquer la fin
      setGameState(prevState => ({
        ...prevState,
        phase: 'GAME_OVER',
        winner: payload.winner,
        finalStats: payload.finalStats
      }));
      
      setGamePhase('GAME_OVER'); // Rester sur l'écran de victoire
    };

    // Timeout pour l'authentification (5 secondes)
    const authTimeout = setTimeout(() => {
      console.warn('⏰ [BombParty] Timeout d\'authentification, passage en mode local');
      setIsAuthenticating(false);
    }, 5000);

    // S'abonner aux événements
    const unsubscribeAuth = client.on('auth:success', handleAuthSuccess);
    const unsubscribeCreated = client.on('lobby:created', handleLobbyCreated);
    const unsubscribeJoined = client.on('lobby:joined', handleLobbyJoined);
    const unsubscribePlayerJoined = client.on('lobby:player_joined', handlePlayerJoined);
    const unsubscribePlayerLeft = client.on('lobby:player_left', handlePlayerLeft);
    const unsubscribeGameState = client.on('game:state', handleGameState);
    const unsubscribeGameEnd = client.on('game:end', handleGameEnd);
    const unsubscribeConnected = client.on('connected', () => {
      clearTimeout(authTimeout);
      client.authenticate('Player' + Math.floor(Math.random() * 1000));
    });
    const unsubscribeError = client.on('error', handleConnectionError);

    return () => {
      clearTimeout(authTimeout);
      unsubscribeAuth();
      unsubscribeCreated();
      unsubscribeJoined();
      unsubscribePlayerJoined();
      unsubscribePlayerLeft();
      unsubscribeGameState();
      unsubscribeGameEnd();
      unsubscribeConnected();
      unsubscribeError();
    };
  }, [client, timer]);

  const handleWordSubmit = useCallback((word: string) => {
    setWordJustSubmitted(true);
    setTurnInProgress(true);

    if (gameMode === 'local') {
      // Mode local : utiliser l'engine local
      const msTaken = performance.now() - turnStartTime;
      const result = engine.submitWord(word, msTaken);
      
      if (result.ok) {
        // Mot valide : passer au tour suivant
        console.log('✅ Mot valide accepté, passage au tour suivant');
        engine.resolveTurn(true, false); // wordValid=true, timeExpired=false
        const newState = engine.getState();
        setGameState(newState);
        
        console.log('🎮 Après mot valide - Phase:', newState.phase, 'isGameOver:', engine.isGameOver());
        
        if (!engine.isGameOver()) {
          // Redémarrer le timer pour le prochain tour
          setTimeout(() => {
            setTurnStartTime(performance.now());
            setGameState(engine.getState());
            setTurnInProgress(false);
            setWordJustSubmitted(false);
          }, 500);
        }
        // Sinon, laisser l'écran de victoire s'afficher (gameState.phase === 'GAME_OVER')
      } else {
        // Mot invalide
        console.log('❌ Mot invalide, vérifier double chance:', result.consumedDoubleChance);
        if (result.consumedDoubleChance) {
          // Double chance utilisée, le joueur peut réessayer
          setTurnInProgress(false);
          setWordJustSubmitted(false);
        } else {
          // Pas de double chance : passer au tour suivant
          engine.resolveTurn(false, false); // wordValid=false, timeExpired=false
          const newState = engine.getState();
          setGameState(newState);
          
          console.log('🎮 Après mot invalide - Phase:', newState.phase, 'isGameOver:', engine.isGameOver());
          
          if (!engine.isGameOver()) {
            setTimeout(() => {
              setTurnStartTime(performance.now());
              setGameState(engine.getState());
              setTurnInProgress(false);
              setWordJustSubmitted(false);
            }, 500);
          }
          // Sinon, laisser l'écran de victoire s'afficher (gameState.phase === 'GAME_OVER')
        }
      }
    } else {
      if (!roomId || !playerId)
        return;
      const msTaken = performance.now() - turnStartTime;
      client.submitWord(roomId, word, msTaken);
    }
  }, [client, roomId, playerId, turnStartTime, gameMode, engine, setWordJustSubmitted, setTurnInProgress, setGameState, setGamePhase]);

  const handleActivateBonus = useCallback((bonusKey: BonusKey) => {
    if (gameMode === 'local') {
      // Mode local : utiliser l'engine local
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (!currentPlayer) return false;
      const result = engine.activateBonus(currentPlayer.id, bonusKey);
      if (result.ok) {
        setGameState(engine.getState());
      }
      return result.ok;
    } else {
      // Mode multijoueur : envoyer au serveur
      if (!roomId || !playerId) {
        console.error('❌ Pas de roomId ou playerId pour activer le bonus');
        return false;
      }
      client.activateBonus(roomId, bonusKey);
      return true;
    }
  }, [client, roomId, playerId, gameMode, engine]);

  const handleBackToMenu = useCallback(() => {
    engine.reset();
    timer.stop();
    setGameState(engine.getState());
    setGamePhase('RULES');
    setCountdown(3);
    if (roomId) {
      client.sendMessage({
        event: 'bp:lobby:leave',
        payload: { roomId }
      });
    }
    setLobbyPlayers([]);
    setIsHost(false);
    setGameMode('local'); // Reset to local mode
  }, [engine, timer, client, roomId]);

  const handleModeSelect = useCallback((mode: 'local' | 'multiplayer', playersCount: number = 1) => {
    setGameMode(mode);
    if (mode === 'local') {
      // Mode local : initialiser et démarrer le jeu avec le nombre de joueurs choisi
      engine.reset();
      const config = { livesPerPlayer: 3, turnDurationMs: 15000, playersCount };
      engine.startGame(config);
      engine.startTurn(); // Démarrer le premier tour
      setGameState(engine.getState());
      setGamePhase('GAME');
      setCountdown(0);
      
      // En mode local, l'engine gère son propre timer
      setTurnStartTime(performance.now());
    } else {
      // Mode multijoueur : aller au lobby
      setGamePhase('LOBBY');
    }
  }, [engine, timer]);

  // Vérifier si c'est le tour du joueur actuel
  const isCurrentPlayerTurn = useCallback(() => {
    if (gameMode === 'local') {
      // Mode local : toujours actif si le jeu est en cours
      return gameState.phase === 'TURN_ACTIVE';
    }
    if (!playerId || !gameState.players.length) {
      return false;
    }
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isTurn = currentPlayer && currentPlayer.id === playerId;
    
    // Log seulement en cas de changement ou d'erreur
    if (gameState.phase === 'TURN_ACTIVE' && (isTurn || !currentPlayer)) {
      console.log('🎮 isCurrentPlayerTurn:', isTurn, {
        playerId,
        currentPlayerIndex: gameState.currentPlayerIndex,
        currentPlayerId: currentPlayer?.id,
        currentPlayerName: currentPlayer?.name,
        phase: gameState.phase
      });
    }
    return isTurn;
  }, [playerId, gameState.players, gameState.currentPlayerIndex, gameMode, gameState.phase]);

  useEffect(() => {
    const timeSinceTurnStart = performance.now() - turnStartTime;
    const isTimerExpired = gameState.phase === 'TURN_ACTIVE' && remainingMs <= 0 && !wordJustSubmitted && !turnInProgress && !timerGracePeriod && timeSinceTurnStart > 1000;
    
    if (isTimerExpired) {
      if (gameMode === 'local') {
        console.log('⏰ Timer expiré en mode local, le joueur perd une vie');
        const wordValid = false;
        const timeExpired = true;
        
        // Mode local : utiliser l'engine local
        engine.resolveTurn(wordValid, timeExpired);
        const newState = engine.getState();
        setGameState(newState);
        
        console.log('🎮 Après expiration timer - Phase:', newState.phase, 'isGameOver:', engine.isGameOver());

        if (!engine.isGameOver()) {
          // L'engine.resolveTurn() appelle déjà startTurn(), donc on n'a pas besoin de l'appeler à nouveau
          // En mode local, l'engine gère son propre timer
          setTimeout(() => {
            setTurnStartTime(performance.now());
            setGameState(engine.getState());
            setTurnInProgress(false);
            setWordJustSubmitted(false);
          }, 500);
        }
        // Sinon, l'écran de victoire s'affichera automatiquement
      } else {
        // Mode multijoueur : le serveur gère la logique, on ne fait rien ici
        // Le serveur enverra automatiquement le nouvel état via handleGameState
        console.log('⏰ Timer expiré en mode multijoueur, attente de la mise à jour du serveur');
      }
    }
  }, [remainingMs, gameState.phase, engine, timer, wordJustSubmitted, turnInProgress, timerGracePeriod, turnStartTime, gameMode]);

  if (gamePhase === 'RULES') {
    return <RulesScreen onContinue={handleModeSelect} />;
  }
  if (gamePhase === 'LOBBY') {
    return <LobbyScreen onCreate={handleLobbyCreate} onJoin={handleLobbyJoin} onBack={handleBackFromLobby} isAuthenticated={!isAuthenticating && !!playerId} />;
  }

  if (gamePhase === 'PLAYERS') {
    return (
      <PlayersScreen
        roomId={roomId || ''}
        players={lobbyPlayers}
        maxPlayers={lobbyMaxPlayers}
        isHost={isHost}
        onStart={handleStartGame}
        onLeave={handleLeaveLobby}
      />
    );
  }

  // Lorsque 12 joueurs sont présents, on augmente l’espacement via PlayerCircle (voir prop radiusBoost plus bas).
  const playersCountForLayout = gameState.players.length;
  const radiusBoost = Math.max(0, (playersCountForLayout - 8) * 15); // +60px à 12 joueurs

  return (
    <BackgroundSurface game="bombparty">
    <SpaceBackground />
    <div className="min-h-screen relative overflow-hidden">
      {/* Compte à rebours */}
      <Countdown count={countdown} isActive={gamePhase === 'GAME' && countdown > 0} />

      {/* Écran de fin de partie */}
      {gameState.phase === 'GAME_OVER' && (() => {
        // Utiliser le winner du backend ou calculer à partir des joueurs vivants
        const winner = (gameState as any).winner || gameState.players.find(p => !p.isEliminated);
        console.log('🏆 [Victory Screen] gameState.phase:', gameState.phase, 'winner:', winner, 'gameState.winner:', (gameState as any).winner);
        
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
            <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-md text-center">
              <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 mb-6 animate-pulse">
                🏆 {t('bombParty.gameOver.title')} 🏆
              </h2>
              {winner && (
                <>
                  <div className="text-6xl mb-4">👑</div>
                  <p className="text-slate-200 text-2xl font-bold mb-2">
                    {t('bombParty.gameOver.victory')}
                  </p>
                  <p className="text-cyan-400 text-3xl font-bold mb-4">
                    {winner.name}
                  </p>
                  <p className="text-slate-400 text-lg mb-6">
                    {t('bombParty.gameOver.livesRemaining', { count: winner.lives })}
                  </p>
                </>
              )}
              {!winner && (
                <p className="text-slate-300 text-xl mb-6">
                  {t('bombParty.gameOver.gameFinished')}
                </p>
              )}
              <button
                onClick={handleBackToMenu}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all duration-200 text-lg shadow-lg hover:shadow-xl"
              >
                {t('bombParty.gameOver.backToMenu')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Interface principale du jeu */}
      <div className="relative w-full h-screen">
        {/* Retiré: anciennes overlays centrées */}

        {/* Bloc debug suggestions en bas à gauche (toggle) */}
        {SUGGESTIONS_ENABLED && gameState.phase === 'TURN_ACTIVE' && gameState.currentTrigram && isCurrentPlayerTurn() && (
          <BottomLeftDebugSuggestions
            title={t('bombParty.hud.wordSuggestions')}
            words={engine.getWordSuggestions(5)}
            trigramInfo={engine.getCurrentTrigramInfo()}
          />
        )}

        {/* Cercle des joueurs (espacement augmenté si beaucoup de joueurs) */}
        <PlayerCircle
          players={gameState.players}
          currentPlayerIndex={gameState.currentPlayerIndex}
          radiusBoost={radiusBoost}
          pendingFastForNextPlayerId={gameState.pendingFastForNextPlayerId}
          onPlayerClick={(id) => setProfilePlayerId(id)}
        />

        {/* Bombe, timer et trigramme au centre */}
        <BombTimer
          trigram={gameState.currentTrigram}
          remainingMs={remainingMs}
          isActive={gameState.phase === 'TURN_ACTIVE'}
          usageCount={gameState.usedWords.length}
          totalPlayers={gameState.players.length}
          flashExtend={timerFlash}
          currentPlayerName={gameState.players[gameState.currentPlayerIndex]?.name}
        />
        

        {/* Saisie du mot — panneau déplaçable (fixed + contraintes viewport) */}
        <DraggablePanel initialOffset={{ x: 0, y: -120 }}>
          <WordInput
            trigram={gameState.currentTrigram}
            usedWords={gameState.usedWords}
            onSubmit={handleWordSubmit}
            isActive={gameState.phase === 'TURN_ACTIVE' && !!isCurrentPlayerTurn()}
            engine={engine}
            bonuses={gameState.players[gameState.currentPlayerIndex]?.bonuses}
            onActivateBonus={handleActivateBonus}
            hasDoubleChance={Boolean(gameState.players[gameState.currentPlayerIndex]?.pendingEffects?.doubleChance)}
          />
        </DraggablePanel>

        {/* Bouton retour au menu */}
        <button
          onClick={handleBackToMenu}
          className="absolute top-6 left-6 px-4 py-2 bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-all duration-200"
        >
          {t('bombParty.backToMenu')}
        </button>

        {/* Chat - seulement en mode multijoueur */}
        {gameMode === 'multiplayer' && <Chat />}

        {/* Information overlay button */}
        <div className="absolute top-6 right-6 z-40">
          <button
            onClick={() => setInfoOpen(true)}
            className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-300 hover:text-white hover:border-slate-500"
            aria-label={t('bombParty.info.openAria')}
          >
            ℹ️
          </button>
        </div>

        {/* Player profile modal */}
        <PlayerProfileModal
          playerId={profilePlayerId}
          open={Boolean(profilePlayerId)}
          onClose={() => setProfilePlayerId(null)}
        />

        {/* Info sidebar */}
        <BombPartyInfoSidebar open={infoOpen} onClose={() => setInfoOpen(false)} />
      </div>
    </div>
    </BackgroundSurface>
  );
}

/* --------- Composants internes --------- */

function BottomLeftDebugSuggestions({
  title,
  words,
  trigramInfo,
}: {
  title: string;
  words: string[];
  trigramInfo: { availableWords: number; totalWords: number } | null;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-30">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1 text-xs rounded bg-slate-800/80 border border-slate-600 text-slate-300 hover:text-white"
      >
        {open ? t('bombParty.debug.hide') : t('bombParty.debug.show')}
      </button>
      {open && (
        <div className="mt-2 bg-slate-800/90 backdrop-blur-md rounded-xl border border-purple-500/30 p-3 max-w-xs">
          <div className="text-xs text-slate-400 mb-2">
            {title}
            {trigramInfo && (
              <span className="ml-2 text-[10px] text-slate-500">
                {trigramInfo.availableWords}/{trigramInfo.totalWords}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {words.map((word, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-purple-600/30 text-purple-200 text-[10px] rounded-md border border-purple-500/30"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Panneau déplaçable pour WordInput.
   initialOffset: décalage vertical par rapport au bas-centre (y négatif = remonter). */
function DraggablePanel({
  children,
  initialOffset = { x: 0, y: 0 },
}: {
  children: React.ReactNode;
  initialOffset?: { x: number; y: number };
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 24, y: window.innerHeight - 200 });
  const [dragging, setDragging] = React.useState(false);
  const startRef = React.useRef<{ mx: number; my: number; x: number; y: number } | null>(null);

  React.useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const next = { x: Math.round(w / 2) + initialOffset.x, y: Math.round(h / 2) + initialOffset.y };
    setPos({ x: clamp(next.x, 16, w - 320), y: clamp(next.y, 16, h - 120) });
  }, [initialOffset.x, initialOffset.y]);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging || !startRef.current) return;
      const dx = e.clientX - startRef.current.mx;
      const dy = e.clientY - startRef.current.my;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cardW = cardRef.current?.offsetWidth ?? 320;
      const cardH = cardRef.current?.offsetHeight ?? 160;
      const nx = clamp(startRef.current.x + dx, 8, w - cardW - 8);
      const ny = clamp(startRef.current.y + dy, 8, h - cardH - 8);
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      setDragging(false);
      startRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const onDown = (e: React.MouseEvent) => {
    startRef.current = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y };
    setDragging(true);
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-40 pointer-events-none"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* barre de saisie draggable */}
      <div className="pointer-events-auto select-none cursor-grab active:cursor-grabbing mb-2 flex items-center gap-2">
        <div
          onMouseDown={onDown}
          className="h-3 w-28 rounded-full bg-slate-600/80 hover:bg-slate-500/90 transition-colors"
          title="Drag"
        />
      </div>
      <div ref={cardRef} className="pointer-events-auto">
        {children}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}