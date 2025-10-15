import { useState, useEffect, useCallback } from 'react';
import { BombPartyEngine } from '../../core/engine';
import { TurnTimer } from '../../core/timer';
import { BombPartyClient } from '../../../services/ws/bombPartyClient';
import { bombPartyStatsService } from '../../../services/bombPartyStatsService';
import type { GameConfig, BonusKey } from '../../core/types';

export interface BombPartyHooksState {
  gamePhase: 'RULES' | 'LOBBY' | 'PLAYERS' | 'GAME' | 'GAME_OVER';
  gameMode: 'local' | 'multiplayer';
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
}

export interface BombPartyHooksActions {
  setGamePhase: (phase: 'RULES' | 'LOBBY' | 'PLAYERS' | 'GAME' | 'GAME_OVER') => void;
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
  const [gamePhase, setGamePhase] = useState<'RULES' | 'LOBBY' | 'PLAYERS' | 'GAME' | 'GAME_OVER'>('RULES');
  const [gameMode, setGameMode] = useState<'local' | 'multiplayer'>('local');
  const [engine] = useState(() => new BombPartyEngine());
  const [timer] = useState(() => new TurnTimer());
  const [client] = useState(() => new BombPartyClient({ mock: false }));
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
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);

  const state: BombPartyHooksState = {
    gamePhase,
    gameMode,
    countdown,
    gameState,
    wordJustSubmitted,
    turnInProgress,
    timerGracePeriod,
    turnStartTime,
    timerFlash,
    profilePlayerId,
    infoOpen,
    playerId,
    roomId,
    lobbyPlayers,
    isHost,
    lobbyMaxPlayers,
    isAuthenticating,
    gameStartTime
  };

  const actions: BombPartyHooksActions = {
    setGamePhase,
    setGameMode,
    setCountdown,
    setGameState,
    setWordJustSubmitted,
    setTurnInProgress,
    setTimerGracePeriod,
    setTurnStartTime,
    setTimerFlash,
    setProfilePlayerId,
    setInfoOpen,
    setPlayerId,
    setRoomId,
    setLobbyPlayers,
    setIsHost,
    setLobbyMaxPlayers,
    setIsAuthenticating,
    setGameStartTime
  };

  const handleRulesContinue = useCallback(() => setGamePhase('LOBBY'), []);

  const handleLobbyCreate = useCallback((meta: { name: string; isPrivate: boolean; password?: string; maxPlayers: number; }) => {
    console.log('[Frontend-BombPartyPage] handleLobbyCreate reçu meta.maxPlayers:', meta.maxPlayers);
    console.log('[Frontend-BombPartyPage] playerId actuel:', playerId);
    
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
    console.log('startGame appelé avec config:', config);
    
    setGameStartTime(Date.now());
    
    if (gameMode === 'local') {
      engine.startGame(config);
      setGameState(engine.getState());
      setGamePhase('GAME');
      setCountdown(0);
    } else {
      if (!roomId) {
        console.log('Pas de roomId pour démarrer le jeu');
        return;
      }
      console.log('Envoi bp:lobby:start au serveur');
      client.startGame(roomId);
    }
  }, [client, roomId, gameMode, engine]);

  const handleStartGame = useCallback(() => {
    console.log('handleStartGame appelé');
    startGame({ livesPerPlayer: 3, turnDurationMs: 15000, playersCount: lobbyPlayers.length });
  }, [startGame, lobbyPlayers.length]);

  const handleWordSubmit = useCallback((word: string) => {
    setWordJustSubmitted(true);
    setTurnInProgress(true);
    
    const responseTime = turnStartTime > 0 ? Date.now() - turnStartTime : 0;
    bombPartyStatsService.recordTrigramAttempt(gameState.currentTrigram, true, responseTime);

    if (gameMode === 'local') {
      const msTaken = performance.now() - turnStartTime;
      const result = engine.submitWord(word, msTaken);
      
      if (result.ok) {
        console.log('Mot valide accepté, passage au tour suivant');
        engine.resolveTurn(true, false);
        const newState = engine.getState();
        setGameState(newState);
        
        console.log('Après mot valide - Phase:', newState.phase, 'isGameOver:', engine.isGameOver());
        
        if (!engine.isGameOver()) {
          setTimeout(() => {
            setTurnStartTime(performance.now());
            setGameState(engine.getState());
            setTurnInProgress(false);
            setWordJustSubmitted(false);
          }, 500);
        }
      } else {
        console.log('Mot invalide, vérifier double chance:', result.consumedDoubleChance);
        if (result.consumedDoubleChance) {
          setTurnInProgress(false);
          setWordJustSubmitted(false);
        } else {
          engine.resolveTurn(false, false);
          const newState = engine.getState();
          setGameState(newState);
          
          console.log('Après mot invalide - Phase:', newState.phase, 'isGameOver:', engine.isGameOver());
          
          if (!engine.isGameOver()) {
            setTimeout(() => {
              setTurnStartTime(performance.now());
              setGameState(engine.getState());
              setTurnInProgress(false);
              setWordJustSubmitted(false);
            }, 500);
          }
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
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (!currentPlayer) return false;
      const result = engine.activateBonus(currentPlayer.id, bonusKey);
      if (result.ok) {
        setGameState(engine.getState());
      }
      return result.ok;
    } else {
      if (!roomId || !playerId) {
        console.error('Pas de roomId ou playerId pour activer le bonus');
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
    setGameMode('local');
  }, [engine, timer, client, roomId]);

  const handleModeSelect = useCallback((mode: 'local' | 'multiplayer', playersCount: number = 1) => {
    setGameMode(mode);
    if (mode === 'local') {
      engine.reset();
      const config = { livesPerPlayer: 3, turnDurationMs: 15000, playersCount };
      engine.startGame(config);
      engine.startTurn();
      setGameState(engine.getState());
      setGamePhase('GAME');
      setCountdown(0);
      
      setTurnStartTime(performance.now());
    } else {
      setGamePhase('LOBBY');
    }
  }, [engine, timer]);

  const isCurrentPlayerTurn = useCallback(() => {
    if (gameMode === 'local') {
      return gameState.phase === 'TURN_ACTIVE';
    }
    if (!playerId || !gameState.players.length) {
      return false;
    }
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isTurn = currentPlayer && currentPlayer.id === playerId;
    
    if (gameState.phase === 'TURN_ACTIVE' && (isTurn || !currentPlayer)) {
      console.log('isCurrentPlayerTurn:', isTurn, {
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
    if (gameState.phase === 'GAME_OVER' && gameStartTime && playerId) {
      const gameEndTime = Date.now();
      const gameData = {
        players: gameState.players,
        history: gameState.history,
        usedWords: gameState.usedWords,
        startTime: gameStartTime,
        endTime: gameEndTime,
        winnerId: (gameState as any).winner?.id
      };

      const stats = bombPartyStatsService.calculateGameStats(gameData, playerId, user?.id || '');
      
      bombPartyStatsService.saveGameStats(stats).catch(error => {
        console.error('Erreur sauvegarde statistiques:', error);
      });
    }
  }, [gameState.phase, gameStartTime, playerId, gameState.players, gameState.history, gameState.usedWords]);

  useEffect(() => {
    const handleConnected = () => {
      console.log('[BombParty] ✅ WebSocket connecté, démarrage authentification...');
      if (user?.name) {
        console.log('[BombParty] Authentification avec le nom:', user.name);
        client.authenticate(user.name);
      } else {
        const guestName = `Guest_${Math.floor(Math.random() * 1000)}`;
        console.log('[BombParty] Utilisateur non connecté, utilisation du nom:', guestName);
        client.authenticate(guestName);
      }
    };

    const handleAuthSuccess = (payload: any) => {
      console.log('[BombParty] Authentification réussie:', payload);
      clearTimeout(authTimeout);
      setPlayerId(payload.playerId);
      setIsAuthenticating(false);
    };

    const handleConnectionError = () => {
      console.error('[BombParty] Erreur de connexion WebSocket');
      setIsAuthenticating(false);
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
      console.log('handleGameState reçu:', payload);
      console.log('État du jeu:', {
        phase: payload.gameState.phase,
        currentPlayerIndex: payload.gameState.currentPlayerIndex,
        players: payload.gameState.players.map((p: any) => ({ id: p.id, name: p.name })),
        currentTrigram: payload.gameState.currentTrigram,
        baseTurnSeconds: payload.gameState.baseTurnSeconds
      });
      
      setGameState(payload.gameState);
      
      if (payload.gameState.phase !== 'GAME_OVER') {
        setGamePhase('GAME');
      }
      setCountdown(0);
      
      setWordJustSubmitted(false);
      setTurnInProgress(false);
      
      if (payload.gameState.phase === 'TURN_ACTIVE') {
        const turnDuration = payload.gameState.turnDurationMs || (payload.gameState.baseTurnSeconds * 1000);
        console.log('🎯 [BombParty] Démarrage du timer multijoueur:', turnDuration, 'ms');
        console.log('🎯 [BombParty] Tour commencé à:', payload.gameState.turnStartedAt);
        
        // Calculate remaining time based on server timestamp
        const serverTurnStart = payload.gameState.turnStartedAt;
        const now = Date.now();
        const elapsed = now - serverTurnStart;
        const remaining = Math.max(0, turnDuration - elapsed);
        
        console.log('🎯 [BombParty] Temps écoulé:', elapsed, 'ms, Temps restant:', remaining, 'ms');
        
        if (remaining > 0) {
          timer.startTurn(remaining);
          setTurnStartTime(performance.now());
          setTimerGracePeriod(true);
          setTimeout(() => setTimerGracePeriod(false), 5000);
        } else {
          console.log('🎯 [BombParty] Timer déjà expiré côté serveur');
          timer.stop();
        }
      }
    };

    const handleGameEnd = (payload: any) => {
      console.log('🏁 [BombParty] Fin de partie reçue:', payload);
      
      setGameState(prevState => ({
        ...prevState,
        phase: 'GAME_OVER',
        winner: payload.winner,
        finalStats: payload.finalStats
      }));
      
      setGamePhase('GAME_OVER');
    };

    const handleWordResult = (payload: any) => {
      console.log('📝 [BombParty] Résultat mot reçu:', payload);
      
      if (payload.valid) {
        console.log('✅ [BombParty] Mot valide:', payload.word);
        // Le mot est valide, l'état du jeu sera mis à jour par handleGameState
      } else {
        console.log('❌ [BombParty] Mot invalide:', payload.word);
        // Le mot est invalide, l'état du jeu sera mis à jour par handleGameState
      }
      
      setWordJustSubmitted(false);
      setTurnInProgress(false);
    };

    const authTimeout = setTimeout(() => {
      console.warn('[BombParty] Timeout d\'authentification, mais continue quand meme');
      // Don't set isAuthenticating to false to allow lobby creation
      // setIsAuthenticating(false);
    }, 5000);

    const unsubscribeAuth = client.on('bp:auth:success', handleAuthSuccess);
    const unsubscribeCreated = client.on('bp:lobby:created', handleLobbyCreated);
    const unsubscribeJoined = client.on('bp:lobby:joined', handleLobbyJoined);
    const unsubscribePlayerJoined = client.on('bp:lobby:player_joined', handlePlayerJoined);
    const unsubscribePlayerLeft = client.on('bp:lobby:player_left', handlePlayerLeft);
    const unsubscribeGameState = client.on('bp:game:state', handleGameState);
    const unsubscribeWordResult = client.on('bp:game:word_result', handleWordResult);
    const unsubscribeGameEnd = client.on('bp:game:end', handleGameEnd);
    console.log('🎧 [BombParty] Enregistrement listener pour événement connected');
    const unsubscribeConnected = client.on('connected', handleConnected);
    const unsubscribeError = client.on('error', handleConnectionError);

    return () => {
      clearTimeout(authTimeout);
      unsubscribeAuth();
      unsubscribeCreated();
      unsubscribeJoined();
      unsubscribePlayerJoined();
      unsubscribePlayerLeft();
      unsubscribeGameState();
      unsubscribeWordResult();
      unsubscribeGameEnd();
      unsubscribeConnected();
      unsubscribeError();
    };
  }, [client, timer]);

  return {
    state,
    actions,
    engine,
    timer,
    client,
    handlers: {
      handleRulesContinue,
      handleLobbyCreate,
      handleLobbyJoin,
      handleBackFromLobby,
      handleLeaveLobby,
      handleStartGame,
      handleWordSubmit,
      handleActivateBonus,
      handleBackToMenu,
      handleModeSelect,
      isCurrentPlayerTurn
    }
  };
}
