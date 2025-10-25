import { useState, useEffect, useCallback, useRef } from 'react';
import { BombPartyEngine } from '../../core/engine';
import { TurnTimer } from '../../core/timer';
import { BombPartyClient } from '../../../services/ws/bombPartyClient';
import { bombPartyStatsService } from '../../../services/bombPartyStatsService';
import { useBombPartyStore } from '../../../store/useBombPartyStore';
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

  const roomIdRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);

  useEffect(() => {
    if (roomId) {
      client.sendMessage({ event: 'bp:room:subscribe', payload: { roomId } });
    }
    return () => {
      if (roomId) {
        client.sendMessage({ event: 'bp:room:unsubscribe', payload: { roomId } });
      }
    };
  }, [client, roomId]);

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
    console.log('[Frontend-BombPartyPage] handleLobbyCreate received meta.maxPlayers:', meta.maxPlayers);
    console.log('[Frontend-BombPartyPage] current playerId:', playerId);
    
    if (!playerId || isAuthenticating) {
      console.error('[BombParty] Cannot create lobby: not authenticated');
      return;
    }
    
    client.createLobby(meta.name, meta.isPrivate, meta.password, meta.maxPlayers);
  }, [client, playerId, isAuthenticating]);

  const handleLobbyJoin = useCallback((roomId: string, password?: string) => {
    if (!playerId || isAuthenticating) {
      console.error('[BombParty] Cannot join lobby: not authenticated');
      return;
    }
    
    client.joinLobby(roomId, password);
  }, [client, playerId, isAuthenticating]);

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
    console.log('startGame called with config:', config);
    
    setGameStartTime(Date.now());
    
    if (gameMode === 'local') {
      engine.startGame(config);
      setGameState(engine.getState());
      setGamePhase('GAME');
      setCountdown(0);
    } else {
      if (!roomId) {
        console.log('No roomId to start game');
        return;
      }
      console.log('Sending bp:lobby:start to server');
      client.startGame(roomId);
    }
  }, [client, roomId, gameMode, engine]);

    const handleStartGame = useCallback(() => {
      console.log('[BombParty] Game start requested', {
        roomId,
        isHost,
        playersCount: lobbyPlayers.length,
        players: lobbyPlayers
      });
      
      if (!roomId) {
        console.error('[BombParty] Cannot start: no roomId');
        return;
      }
      if (!isHost) {
        console.error('[BombParty] Cannot start: not host');
        return;
      }
      if (lobbyPlayers.length < 2) {
        console.error('[BombParty] Cannot start: not enough players');
        return;
      }
      
      console.log('[BombParty] Sending start to server');
      client.startGame(roomId);
    }, [client, roomId, isHost, lobbyPlayers.length]);  const handleWordSubmit = useCallback((word: string) => {
    setWordJustSubmitted(true);
    setTurnInProgress(true);
    
    const responseTime = turnStartTime > 0 ? Date.now() - turnStartTime : 0;
    bombPartyStatsService.recordTrigramAttempt(gameState.currentTrigram, true, responseTime);

    if (gameMode === 'local') {
      const msTaken = performance.now() - turnStartTime;
      const result = engine.submitWord(word, msTaken);
      
      if (result.ok) {
        engine.resolveTurn(true, false);
        const newState = engine.getState();
        setGameState(newState);
        
        
        if (!engine.isGameOver()) {
          setTimeout(() => {
            setTurnStartTime(performance.now());
            setGameState(engine.getState());
            setTurnInProgress(false);
            setWordJustSubmitted(false);
          }, 500);
        }
      } else {
        if (result.consumedDoubleChance) {
          setTurnInProgress(false);
          setWordJustSubmitted(false);
        } else {
          engine.resolveTurn(false, false);
          const newState = engine.getState();
          setGameState(newState);
          
          
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
      
      const redirectTimer = setTimeout(() => {
        console.log("[BombParty] Game ended, redirecting to home screen");
        alert("Game ended. Returning to home screen...");
        setGamePhase('RULES');
      }, 5000);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [gameState.phase, gameStartTime, playerId, gameState.players, gameState.history, gameState.usedWords, setGamePhase]);

  useEffect(() => {
    const connect = () => {
      console.log('[BombPartyHooks] Attempting WebSocket connection');
      client.connect();
    };
        const connectionTimer = setTimeout(connect, 100);
    
    const handleConnected = () => {
      // Reset authentication state on new connection
      setIsAuthenticating(true);
      setPlayerId(null);
      
      const guestId = Math.floor(Math.random() * 1000);
      const playerName = user?.name || `Guest_${guestId}`;
      
      console.log('[BombPartyHooks] Authentification avec le nom:', playerName);
      client.authenticate(playerName);
    };    const handleAuthSuccess = (payload: any) => {
      console.log('[BombPartyHooks] Authentication successful, playerId:', payload.playerId);
      clearTimeout(authTimeout);
      setPlayerId(payload.playerId);
      setIsAuthenticating(false);
    };

    const handleConnectionError = () => {
      console.error('[BombPartyHooks] WebSocket connection error');
      setPlayerId(null);
      setIsAuthenticating(false);
    };

    const handleLobbyCreated = (payload: any) => {
      setRoomId(payload.roomId);
      setLobbyMaxPlayers(payload.maxPlayers || 4);
      setIsHost(true);
      setGamePhase('PLAYERS');
    };

    const handleLobbyJoined = (payload: any) => {
      console.log('[BombParty] Lobby rejoint:', payload);
      
      const curPlayerId = playerIdRef.current;
      const curRoomId = roomIdRef.current;
      
      const isAlreadyInRoom = curRoomId === payload.roomId;
      const isMyJoin = payload.playerId === curPlayerId;
      
      console.log('[BombParty] handleLobbyJoined debug:', {
        isAlreadyInRoom,
        isMyJoin,
        currentRoomId: curRoomId,
        payloadRoomId: payload.roomId,
        myPlayerId: curPlayerId,
        payloadPlayerId: payload.playerId
      });
      
      setRoomId(payload.roomId);
      setLobbyMaxPlayers(payload.maxPlayers || 4);
      setLobbyPlayers(payload.players || []);
      
      if (isMyJoin) {
        if (payload.players && payload.players.length > 0 && curPlayerId) {
          const firstPlayer = payload.players[0];
          const amIHost = firstPlayer.id === curPlayerId;
          console.log('[BombParty] Mise a jour du statut hote (mon join):', {
            playerId: curPlayerId,
            firstPlayerId: firstPlayer.id,
            amIHost
          });
          setIsHost(amIHost);
        }
      } else {
        console.log('[BombParty] Message concernant un autre joueur, conservation de mon statut isHost');
      }
      
      setGamePhase('PLAYERS');
    };

    const handlePlayerJoined = (payload: any) => {
      console.log('[BombParty] Joueur rejoint, nouveau state:', payload);
      const curRoomId = roomIdRef.current;
      const curPlayerId = playerIdRef.current;
      
      if (payload.roomId === curRoomId) {
        setLobbyPlayers(payload.players || []);
        setLobbyMaxPlayers(payload.maxPlayers || 4);
        
        const firstPlayer = payload.players?.[0];
        if (firstPlayer && curPlayerId) {
          const isHostPlayer = firstPlayer.id === curPlayerId;
          console.log('[BombParty] Verification hote:', {
            playerId: curPlayerId,
            firstPlayerId: firstPlayer.id,
            isHost: isHostPlayer
          });
          setIsHost(isHostPlayer);
        }
      }
    };

    const handlePlayerLeft = (payload: any) => {
      setLobbyPlayers(payload.players || []);
    };

    const handleRoomState = (payload: any) => {
      console.log("[BombParty] Room state received:", {
        roomId: payload.roomId,
        currentRoomId: roomId,
        players: payload.players,
        currentPlayerId: playerId
      });
      
      if (payload.roomId && payload.roomId !== roomId) {
        setRoomId(payload.roomId);
      }
      
      if (!roomId || payload.roomId === roomId) {
        setLobbyPlayers(payload.players || []);
        setLobbyMaxPlayers(payload.maxPlayers || 4);
        
        const firstPlayer = payload.players?.[0];
        if (firstPlayer && playerId) {
          const isHostPlayer = firstPlayer.id === playerId;
          console.log("[BombParty] Checking host status:", {
            playerId,
            firstPlayerId: firstPlayer.id,
            isNowHost: isHostPlayer,
            currentRoomId: roomId,
            receivedRoomId: payload.roomId
          });
          setIsHost(isHostPlayer);
        }
      }
    };

    const handleGameEnd = (payload: any) => {
      
      setGameState(prevState => ({
        ...prevState,
        phase: 'GAME_OVER',
        winner: payload.winner,
        finalStats: payload.finalStats
      }));
      
      setGamePhase('GAME_OVER');
    };

    const handleWordResult = (payload: any) => {
      
      if (payload.valid) {
      } else {
      }
      
      setWordJustSubmitted(false);
      setTurnInProgress(false);
    };

    const authTimeout = setTimeout(() => {
      console.warn('[BombParty] Authentication timeout - resetting connection');
      setPlayerId(null);
      setIsAuthenticating(false);
      client.authenticate(user?.name || `Guest_${Math.floor(Math.random() * 1000)}`);
    }, 5000);

    const unsubscribeAuth = client.on('bp:auth:success', handleAuthSuccess);
    const unsubscribeCreated = client.on('bp:lobby:created', handleLobbyCreated);
    const unsubscribeJoined = client.on('bp:lobby:joined', handleLobbyJoined);
    const unsubscribePlayerJoined = client.on('bp:lobby:player_joined', handlePlayerJoined);
    const unsubscribeRoomState = client.on('bp:room:state', handleRoomState);
    const unsubscribePlayerLeft = client.on('bp:lobby:player_left', handlePlayerLeft);
    
    // Handle lobby list updates
    const handleLobbyListUpdate = (payload: any) => {
      console.log('[BombPartyHooks] Lobby list updated, rooms:', payload?.rooms?.length);
      if (payload?.rooms) {
        const store = useBombPartyStore.getState();
        store.setLobbies(payload.rooms);
      }
    };
    const unsubscribeLobbyList = client.on('bp:lobby:list' as any, handleLobbyListUpdate);
    const unsubscribeLobbyListUpdated = client.on('bp:lobby:list_updated' as any, handleLobbyListUpdate);
    
    const unsubscribeGameCountdown = client.on("bp:game:countdown", (payload: any) => {
      console.log("[BombParty Debug] Received bp:game:countdown:", payload);
      const curRoom = roomIdRef.current;
      if (!payload?.roomId || payload.roomId !== curRoom) return;

      const startTime = payload.startTime ?? Date.now();
      const duration = payload.countdownDuration ?? 3000;
      const update = () => {
        const now = Date.now();
        const remainingMs = Math.max(0, startTime + duration - now);
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        setCountdown(remainingSeconds);
      };

      setGamePhase("GAME");
      update();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      const countdownInterval = setInterval(() => {
        update();
        if (Date.now() >= startTime + duration) {
          clearInterval(countdownInterval);
          setCountdown(0);
        }
      }, 100) as unknown as number;
      countdownIntervalRef.current = countdownInterval;
    });

    const unsubscribeGameStart = client.on("bp:game:start", (payload: any) => {
      console.log("[BombParty Debug] Received bp:game:start:", payload);
      const curRoom = roomIdRef.current;
      if (payload.roomId === curRoom) {
        console.log("[BombParty] Game starting for room", payload.roomId);
        setGamePhase("GAME");
        setCountdown(0);
        setGameStartTime(Date.now());
      }
    });

    const unsubscribeGameState = client.on("bp:game:state", (payload: any) => {
      const curRoom = roomIdRef.current;
      const curPlayerId = playerIdRef.current;
      
      if (!payload?.roomId || payload.roomId !== curRoom) {
        console.log("[BombParty] Ignoring game state for different room", { currentRoomId: curRoom, payloadRoomId: payload?.roomId });
        return;
      }

      console.log("[BombParty] Game state update:", {
        phase: payload.gameState.phase,
        playerId: curPlayerId,
        currentPlayerId: payload.gameState.currentPlayerId,
        players: payload.gameState.players?.map((p: any) => ({ id: p.id, name: p.name, lives: p.lives, isEliminated: p.isEliminated })) || [],
        currentTrigram: payload.gameState.currentTrigram,
        usedWords: payload.gameState.usedWords,
        hasUsedWords: !!payload.gameState.usedWords
      });

      setGameState(payload.gameState);

      if (payload.gameState.phase === "TURN_ACTIVE") {
        setGamePhase("GAME");
        setCountdown(0);
        setWordJustSubmitted(false);
        setTurnInProgress(false);
        const turnDuration = payload.gameState.turnDurationMs || (payload.gameState.baseTurnSeconds * 1000);

        const serverTurnStart = payload.gameState.turnStartedAt;
        const now = Date.now();
        const elapsed = now - serverTurnStart;
        const remaining = Math.max(0, turnDuration - elapsed);

        if (remaining > 0) {
          timer.startTurn(remaining);
          setTurnStartTime(performance.now());
          setTimerGracePeriod(true);
          setTimeout(() => setTimerGracePeriod(false), 5000);
        } else {
          timer.stop();
        }
      }
    });
    
    const unsubscribeWordResult = client.on('bp:game:word_result', handleWordResult);
    const unsubscribeGameEnd = client.on('bp:game:end', handleGameEnd);
    const unsubscribeConnected = client.on('connected', handleConnected);
    const unsubscribeError = client.on('error', handleConnectionError);

    return () => {
      clearTimeout(authTimeout);
      clearTimeout(connectionTimer); // Nettoyer le timer de connexion
      
      // Nettoyer la connexion WebSocket
      console.log('[BombPartyHooks] Nettoyage du client WebSocket');
      client.disconnect();
      
      // Nettoyer les intervalles
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      
      // Nettoyer les abonnements
      unsubscribeAuth();
      unsubscribeCreated();
      unsubscribeJoined();
      unsubscribePlayerJoined();
      unsubscribeLobbyList();
      unsubscribeLobbyListUpdated();
      unsubscribePlayerLeft();
      unsubscribeGameCountdown();
      unsubscribeGameStart();
      unsubscribeGameState();
      unsubscribeWordResult();
      unsubscribeGameEnd();
      unsubscribeConnected();
      unsubscribeError();
    };
  }, [client, timer, user]);

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
