import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useBombPartyStore } from '../../../store/useBombPartyStore';
import type { BombPartyStore } from '../../../store/useBombPartyStore';
import { logger } from '../../../utils/logger';
import type { GameConfig, BonusKey } from '../../core/types';
import { useBombPartyWebSocket } from '../../../hooks/bombparty/useBombPartyWebSocket';
import { useBombPartyGame } from '../../../hooks/bombparty/useBombPartyGame';
import { useBombPartyLobby } from '../../../hooks/bombparty/useBombPartyLobby';
import { bombPartyService } from '../../../services/bombPartyService';
import { timerService } from '../../../services/timerService';

import type { GamePhase } from '../../../store/useBombPartyStore';

export interface BombPartyHooksState {
  gamePhase: GamePhase;
  gameMode: 'local' | 'multiplayer';
  multiplayerType: 'quickmatch' | null;
  countdown: number;
  gameState: any;
  wordJustSubmitted: boolean;
  turnInProgress: boolean;
  timerGracePeriod: boolean;
  turnStartTime: number;
  timerFlash: boolean;
  profilePlayerId: string | null;
  infoOpen: boolean;
  playerId: string | null;
  roomId: string | null;
  lobbyPlayers: Array<{id: string; name: string}>;
  isHost: boolean;
  lobbyMaxPlayers: number;
  isAuthenticating: boolean;
  gameStartTime: number | null;
  bonusNotification: { bonusKey: BonusKey; playerName: string } | null;
}

export interface BombPartyHooksActions {
  setGamePhase: (phase: GamePhase) => void;
  setGameMode: (mode: 'local' | 'multiplayer') => void;
  setCountdown: (count: number) => void;
  setGameState: (state: any) => void;
  setWordJustSubmitted: (value: boolean) => void;
  setTurnInProgress: (value: boolean) => void;
  setTimerGracePeriod: (value: boolean) => void;
  setTurnStartTime: (time: number) => void;
  setTimerFlash: (value: boolean) => void;
  setProfilePlayerId: (id: string | null) => void;
  setInfoOpen: (open: boolean) => void;
  setPlayerId: (id: string | null) => void;
  setRoomId: (id: string | null) => void;
  setLobbyPlayers: (players: Array<{id: string; name: string}>) => void;
  setIsHost: (isHost: boolean) => void;
  setLobbyMaxPlayers: (max: number) => void;
  setIsAuthenticating: (auth: boolean) => void;
  setGameStartTime: (time: number | null) => void;
}

export function useBombPartyHooks(user: any) {
  const gameHook = useBombPartyGame(user);
  const lobbyHook = useBombPartyLobby();
  
  const countdownIntervalRef = useRef<number | null>(null);
  const gracePeriodTimerRef = useRef<number | null>(null);
  
  const wsHook = useBombPartyWebSocket(user, {
    timer: gameHook.timer,
    onGameStateUpdate: (gameState) => {
      gameHook.setGameState(gameState);
    },
    onTurnStart: (turnStartedAt, turnDurationMs) => {
      gameHook.setTurnStartTime(turnStartedAt);
      gameHook.setTimerGracePeriod(true);
      
      if (gracePeriodTimerRef.current) {
        timerService.clearTimeout(gracePeriodTimerRef.current);
      }
      gracePeriodTimerRef.current = timerService.setTimeout(() => {
        gameHook.setTimerGracePeriod(false);
        gracePeriodTimerRef.current = null;
      }, 5000);
    }
  });

  const gamePhase = useBombPartyStore((state: BombPartyStore) => state.gamePhase);
  const gameMode = useBombPartyStore((state: BombPartyStore) => state.gameMode);
  const multiplayerType = useBombPartyStore((state: BombPartyStore) => state.multiplayerType);
  const countdown = useBombPartyStore((state: BombPartyStore) => state.countdown);
  const profilePlayerId = useBombPartyStore((state: BombPartyStore) => state.ui.profilePlayerId);
  const infoOpen = useBombPartyStore((state: BombPartyStore) => state.ui.infoOpen);
  
  const setGamePhase = useBombPartyStore((state: BombPartyStore) => state.setGamePhase);
  const setGameMode = useBombPartyStore((state: BombPartyStore) => state.setGameMode);
  const setMultiplayerType = useBombPartyStore((state: BombPartyStore) => state.setMultiplayerType);
  const setCountdown = useBombPartyStore((state: BombPartyStore) => state.setCountdown);
  const setProfilePlayerId = useBombPartyStore((state: BombPartyStore) => state.setProfilePlayerId);
  const setInfoOpen = useBombPartyStore((state: BombPartyStore) => state.setInfoOpen);
  
  useEffect(() => {
    const storeRoomId = useBombPartyStore.getState().connection.roomId;
    
    if (gameMode === 'multiplayer' && storeRoomId && gamePhase === 'RULES') {
      setGamePhase('GAME');
    }
  }, [gameMode, gamePhase, setGamePhase]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        timerService.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (gracePeriodTimerRef.current) {
        timerService.clearTimeout(gracePeriodTimerRef.current);
        gracePeriodTimerRef.current = null;
      }
    };
  }, []);

  const storeConnection = useBombPartyStore((state: BombPartyStore) => state.connection);
  useEffect(() => {
    if (storeConnection.lobbyPlayers && storeConnection.lobbyPlayers.length > 0) {
      lobbyHook.setLobbyPlayers(storeConnection.lobbyPlayers);
    }
    if (storeConnection.lobbyMaxPlayers) {
      lobbyHook.setLobbyMaxPlayers(storeConnection.lobbyMaxPlayers);
    }
    if (storeConnection.isHost !== undefined) {
      lobbyHook.setIsHost(storeConnection.isHost);
    }
  }, [storeConnection.lobbyPlayers, storeConnection.lobbyMaxPlayers, storeConnection.isHost, lobbyHook]);

  const handleRulesContinue = useCallback(() => setGamePhase('LOBBY'), []);

  const handleLobbyCreate = useCallback((meta: { name: string; isPrivate: boolean; password?: string; maxPlayers: number; }) => {
    if (gameMode !== 'multiplayer') {
      setGameMode('multiplayer');
    }
    lobbyHook.handleLobbyCreate(meta);
  }, [lobbyHook, gameMode, setGameMode]);

  const handleLobbyJoin = useCallback((roomId: string, password?: string) => {
    lobbyHook.handleLobbyJoin(roomId, password);
  }, [lobbyHook]);

  const handleBackFromLobby = useCallback(() => {
    setGamePhase('RULES');
  }, []);

  const handleLeaveLobby = useCallback(() => {
    if (wsHook.roomId) {
      bombPartyService.leaveRoom();
    }
  }, [wsHook]);

  const startGame = useCallback((config: GameConfig) => {
    gameHook.setGameStartTime(Date.now());
    
    if (gameMode === 'local') {
      gameHook.startGame(config, 'local', null);
      setGamePhase('GAME');
      setCountdown(0);
    } else {
      if (!wsHook.roomId) {
        return;
      }
      bombPartyService.startGame();
    }
  }, [gameHook, wsHook, gameMode, setGamePhase, setCountdown]);

    const handleStartGame = useCallback(() => {
    lobbyHook.handleStartGame(wsHook.roomId, lobbyHook.isHost, lobbyHook.lobbyPlayers);
  }, [lobbyHook, wsHook]);

  const handleWordSubmit = useCallback((word: string) => {
    gameHook.handleWordSubmit(word, gameMode, wsHook.roomId, wsHook.playerId);
  }, [gameHook, wsHook, gameMode]);
  
  const handleActivateBonus = useCallback((bonusKey: BonusKey) => {
    return gameHook.handleActivateBonus(bonusKey, gameMode, wsHook.roomId, wsHook.playerId);
  }, [gameHook, wsHook, gameMode]);

  const handleBackToMenu = useCallback(() => {
    if (countdownIntervalRef.current) {
      timerService.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (gracePeriodTimerRef.current) {
      timerService.clearTimeout(gracePeriodTimerRef.current);
      gracePeriodTimerRef.current = null;
    }
    
    gameHook.resetGame();
    setGamePhase('RULES');
    setCountdown(0);
    if (wsHook.roomId) {
      bombPartyService.leaveRoom();
    }
    lobbyHook.setLobbyPlayers([]);
    lobbyHook.setIsHost(false);
    setGameMode('local');
    setMultiplayerType(null);
  }, [gameHook, wsHook, lobbyHook, setGameMode, setCountdown, setGamePhase, setMultiplayerType]);

    const handleModeSelect = useCallback((mode: 'local' | 'multiplayer', playersCount: number = 1, multiplayerTypeParam?: 'quickmatch') => {
    if (countdownIntervalRef.current) {
      timerService.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    setGameMode(mode);
    if (mode === 'local') {
      setMultiplayerType(null);
      const config = { livesPerPlayer: 3, turnDurationMs: 15000, playersCount };
      
      setGamePhase('GAME');
      setCountdown(3);
      
      let count = 3;
      countdownIntervalRef.current = timerService.setInterval(() => {
        count--;
        setCountdown(count);
        
        if (count === 0) {
          if (countdownIntervalRef.current) {
            timerService.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCountdown(0);
          gameHook.startGame(config, 'local', null);
          gameHook.engine.startTurn();
          const engineState = gameHook.engine.getState();
          gameHook.setGameState(engineState);
          const turnStart = engineState.turnStartedAt || Date.now();
          const turnDuration = engineState.turnDurationMs || 15000;
          gameHook.setTurnStartTime(turnStart);
          
          if (gameHook.timer && turnStart && turnDuration) {
            gameHook.timer.startTurn(turnStart, turnDuration, Date.now());
          }
        }
      }, 1000);
    } else {
      setMultiplayerType(multiplayerTypeParam || null);
      setGamePhase('LOBBY');
    }
  }, [gameHook, setGamePhase, setGameMode, setCountdown, setMultiplayerType]);

  const isCurrentPlayerTurn = useCallback(() => {
    return gameHook.isCurrentPlayerTurn(gameMode, wsHook.playerId);
  }, [gameHook, wsHook, gameMode]);

  const state: BombPartyHooksState = useMemo(() => ({
    gamePhase,
    gameMode,
    multiplayerType,
    countdown,
    gameState: gameHook.gameState,
    wordJustSubmitted: gameHook.wordJustSubmitted,
    turnInProgress: gameHook.turnInProgress,
    timerGracePeriod: gameHook.timerGracePeriod,
    turnStartTime: gameHook.turnStartTime,
    timerFlash: gameHook.timerFlash,
    profilePlayerId,
    infoOpen,
    playerId: wsHook.playerId,
    roomId: wsHook.roomId,
    lobbyPlayers: lobbyHook.lobbyPlayers,
    isHost: lobbyHook.isHost,
    lobbyMaxPlayers: lobbyHook.lobbyMaxPlayers,
    isAuthenticating: wsHook.isAuthenticating,
    gameStartTime: gameHook.gameStartTime,
    bonusNotification: gameHook.bonusNotification
  }), [
    gamePhase,
    gameMode,
    multiplayerType,
    countdown,
    gameHook.gameState,
    gameHook.wordJustSubmitted,
    gameHook.turnInProgress,
    gameHook.timerGracePeriod,
    gameHook.turnStartTime,
    gameHook.timerFlash,
    profilePlayerId,
    infoOpen,
    wsHook.playerId,
    wsHook.roomId,
    wsHook.isAuthenticating,
    lobbyHook.lobbyPlayers,
    lobbyHook.isHost,
    lobbyHook.lobbyMaxPlayers,
    gameHook.gameStartTime,
    gameHook.bonusNotification
  ]);

  const actions: BombPartyHooksActions = useMemo(() => ({
    setGamePhase,
    setGameMode,
    setCountdown,
    setGameState: gameHook.setGameState,
    setWordJustSubmitted: gameHook.setWordJustSubmitted,
    setTurnInProgress: gameHook.setTurnInProgress,
    setTimerGracePeriod: gameHook.setTimerGracePeriod,
    setTurnStartTime: gameHook.setTurnStartTime,
    setTimerFlash: gameHook.setTimerFlash,
    setProfilePlayerId,
    setInfoOpen,
    setPlayerId: wsHook.setPlayerId,
    setRoomId: wsHook.setRoomId,
    setLobbyPlayers: lobbyHook.setLobbyPlayers,
    setIsHost: lobbyHook.setIsHost,
    setLobbyMaxPlayers: lobbyHook.setLobbyMaxPlayers,
    setIsAuthenticating: wsHook.setIsAuthenticating,
    setGameStartTime: gameHook.setGameStartTime
  }), [
    setGamePhase,
    setGameMode,
    setCountdown,
    gameHook,
    wsHook,
    lobbyHook,
    setProfilePlayerId,
    setInfoOpen
  ]);

  return {
    state,
    actions,
    engine: gameHook.engine,
    timer: gameHook.timer,
    client: null,
    handlers: {
      handleRulesContinue,
      handleLobbyCreate,
      handleLobbyJoin,
      handleBackFromLobby,
      handleLeaveLobby,
      handleStartGame,
      handleWordSubmit,
      handleActivateBonus,
      handleCloseBonusNotification: () => gameHook.setBonusNotification(null),
      handleBackToMenu,
      handleModeSelect,
      isCurrentPlayerTurn
    }
  };
}
