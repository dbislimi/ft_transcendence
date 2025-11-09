import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTurnTimer } from '../core/timer';
import { useAuth } from '../../contexts/AuthContext';
import RulesScreen from '../RulesScreen';
import { bombPartyService } from '../../services/bombPartyService';
import { 
  useBombPartyHooks, 
  BombPartyLayout, 
  BombPartyLobbyView, 
  BombPartyUI
} from './bombparty';
import { useBombPartyStore } from '../../store/useBombPartyStore';

export default function BombPartyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // no player-name modal at page level; handled inside tournament view only

  // initialise le service bombparty au montage (seulement quand on entre dans la page bombparty)
  useEffect(() => {
    console.log('[BombPartyPage] Mounting - initializing service');
    bombPartyService.init();
  }, []);

  // Auto-join room if room parameter is present (from tournament match)
  useEffect(() => {
    const roomIdFromUrl = searchParams.get('room');
    if (roomIdFromUrl) {
      console.log('[BombPartyPage] Room parameter detected, attempting to join:', roomIdFromUrl);
      const connection = useBombPartyStore.getState().connection;
      
      // Wait for connection to be ready, then join
      const tryJoin = () => {
        const conn = useBombPartyStore.getState().connection;
        if (conn.state === 'connected' && conn.playerId) {
          console.log('[BombPartyPage] Connection ready, subscribing to room:', roomIdFromUrl);
          bombPartyService.joinRoom(roomIdFromUrl);
        } else {
          console.log('[BombPartyPage] Waiting for connection...', conn.state);
          setTimeout(tryJoin, 500);
        }
      };
      
      tryJoin();
    }
  }, [searchParams]);
  
  // Player name modal handled in BombPartyTournamentView

  const {
    state,
    actions,
    engine,
    timer,
    client,
    handlers
  } = useBombPartyHooks(user);

  const isMultiplayerTimerActive = state.gameState.phase === 'TURN_ACTIVE' && state.gameMode === 'multiplayer';
  const multiplayerRemainingMs = useTurnTimer(timer, isMultiplayerTimerActive);
  
  // Mode local : utiliser turnEndsAt si disponible, sinon calculer depuis turnStartedAt
  const localRemainingMs = state.gameMode === 'local' && state.gameState.phase === 'TURN_ACTIVE' 
    ? (state.gameState.turnEndsAt 
        ? Math.max(0, state.gameState.turnEndsAt - Date.now())
        : (state.gameState.turnStartedAt && state.gameState.turnDurationMs
            ? Math.max(0, (state.gameState.turnStartedAt + state.gameState.turnDurationMs) - Date.now())
            : 0))
    : 0;

  const remainingMs = state.gameMode === 'local' ? localRemainingMs : multiplayerRemainingMs;
  

  const [, forceUpdate] = useState({});
  useEffect(() => {
    if (state.gameMode === 'local' && state.gameState.phase === 'TURN_ACTIVE') {
      const interval = setInterval(() => {
        forceUpdate({});
      }, 200);
      return () => clearInterval(interval);
    }
  }, [state.gameMode, state.gameState.phase]);

  useEffect(() => {
    const timeSinceTurnStart = Date.now() - state.turnStartTime;
    const isTimerExpired = state.gameState.phase === 'TURN_ACTIVE' && remainingMs <= 0 && !state.wordJustSubmitted && !state.turnInProgress && !state.timerGracePeriod && timeSinceTurnStart > 1000;
    
    if (isTimerExpired) {
      if (state.gameMode === 'local') {
        console.log('Timer expiré en mode local, le joueur perd une vie');
        const wordValid = false;
        const timeExpired = true;
        
        engine.resolveTurn(wordValid, timeExpired);
        const newState = engine.getState();
        actions.setGameState(newState);
        
        console.log('Après expiration timer - Phase:', newState.phase, 'isGameOver:', engine.isGameOver());

        if (!engine.isGameOver()) {
          setTimeout(() => {
            actions.setTurnStartTime(Date.now());
            actions.setGameState(engine.getState());
            actions.setTurnInProgress(false);
            actions.setWordJustSubmitted(false);
          }, 500);
        }
      } else {
        console.log('Timer expiré en mode multijoueur, attente de la mise à jour du serveur');
      }
    }
  }, [remainingMs, state.gameState.phase, engine, timer, state.wordJustSubmitted, state.turnInProgress, state.timerGracePeriod, state.turnStartTime, state.gameMode]);

  const handlePlayerClick = (id: string) => {
    if (id === '') {
      actions.setProfilePlayerId(null);
    } else {
      actions.setProfilePlayerId(id);
    }
  };

  const handleInfoToggle = () => {
    actions.setInfoOpen(!state.infoOpen);
  };

  const handleBackFromRules = () => {
    navigate('/');
  };

  if (state.gamePhase === 'RULES') {
    return (
      <RulesScreen 
        onContinue={handlers.handleModeSelect} 
        onBack={handleBackFromRules}
        initialMultiplayerType={state.multiplayerType} // Passer le type multijoueur pour revenir au bon écran
      />
    );
  }

  if (state.gamePhase === 'LOBBY' || state.gamePhase === 'PLAYERS') {
    return (
      <BombPartyLobbyView
        state={state}
        client={client}
        onLobbyCreate={handlers.handleLobbyCreate}
        onLobbyJoin={handlers.handleLobbyJoin}
        onBackFromLobby={handlers.handleBackFromLobby}
        onLeaveLobby={handlers.handleLeaveLobby}
        onStartGame={handlers.handleStartGame}
      />
    );
  }

  return (
    <>
      <BombPartyUI
        state={state}
        onBackToMenu={handlers.handleBackToMenu}
      />
      <BombPartyLayout
        state={state}
        engine={engine}
          remainingMs={remainingMs}
        isCurrentPlayerTurn={handlers.isCurrentPlayerTurn}
        onWordSubmit={handlers.handleWordSubmit}
        onActivateBonus={handlers.handleActivateBonus}
        onBackToMenu={handlers.handleBackToMenu}
        onPlayerClick={handlePlayerClick}
        onInfoToggle={handleInfoToggle}
        onCloseBonusNotification={handlers.handleCloseBonusNotification}
        gameMode={state.gameMode}
      />
    </>
  );
}
