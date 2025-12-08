import { useState, useEffect, useRef, useCallback } from 'react';
import { BombPartyClient } from '../../services/ws/bombPartyClient';
import { useBombPartyStore } from '../../store/useBombPartyStore';
import { logger } from '../../utils/logger';
import type { BonusKey } from '../../game-bomb-party/core/types';
import { wsCoordinator } from '../../services/ws/WebSocketCoordinator';
import { bombPartyService } from '../../services/bombPartyService';

export interface UseBombPartyWebSocketReturn {
  client: BombPartyClient;
  playerId: string | null;
  roomId: string | null;
  isAuthenticating: boolean;
  setPlayerId: (id: string | null) => void;
  setRoomId: (id: string | null) => void;
  setIsAuthenticating: (auth: boolean) => void;
}

export interface UseBombPartyWebSocketOptions {
  timer?: any;
  onGameStateUpdate?: (gameState: any) => void;
  onTurnStart?: (turnStartedAt: number, turnDurationMs: number) => void;
}

export function useBombPartyWebSocket(user: any, options?: UseBombPartyWebSocketOptions) {
  const { timer, onGameStateUpdate, onTurnStart } = options || {};
  const [client] = useState(() => new BombPartyClient({ mock: false }));
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const roomIdRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const cleanupDoneRef = useRef<boolean>(false);
  const cleanupCountRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const authTimeoutRef = useRef<number | null>(null);
  const timerRef = useRef(options?.timer);
  const onGameStateUpdateRef = useRef(options?.onGameStateUpdate);
  const onTurnStartRef = useRef(options?.onTurnStart);
  const setGamePhase = useBombPartyStore((state) => state.setGamePhase);
  const setGameState = useBombPartyStore((state) => state.receiveServerState);
  const setCountdown = useBombPartyStore((state) => state.setCountdown);
  const setGameStartTime = useBombPartyStore((state) => state.setGameStartTime);
  const setWordJustSubmitted = useBombPartyStore((state) => state.setWordJustSubmitted);
  const setTurnInProgress = useBombPartyStore((state) => state.setTurnInProgress);
  const setTurnStartTime = useBombPartyStore((state) => state.setTurnStartTime);
  const setTimerGracePeriod = useBombPartyStore((state) => state.setTimerGracePeriod);
  const setTimerFlash = useBombPartyStore((state) => state.setTimerFlash);
  const setBonusNotification = useBombPartyStore((state) => state.setBonusNotification);
  const setLobbyPlayers = useBombPartyStore((state) => state.setLobbyPlayers);
  const setIsHost = useBombPartyStore((state) => state.setIsHost);
  const setLobbyMaxPlayers = useBombPartyStore((state) => state.setLobbyMaxPlayers);
  const setRoomIdStore = useBombPartyStore((state) => state.setRoomId);
  const setPlayerIdStore = useBombPartyStore((state) => state.setPlayerId);
  const gameState = useBombPartyStore((state) => state.gameState);

  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);
  useEffect(() => {
    timerRef.current = options?.timer;
    onGameStateUpdateRef.current = options?.onGameStateUpdate;
    onTurnStartRef.current = options?.onTurnStart;
  }, [options?.timer, options?.onGameStateUpdate, options?.onTurnStart]);

  useEffect(() => {
    if (playerId) setPlayerIdStore(playerId);
  }, [playerId, setPlayerIdStore]);

  useEffect(() => {
    if (roomId) setRoomIdStore(roomId);
  }, [roomId, setRoomIdStore]);

  useEffect(() => {
    if (roomId && mountedRef.current) {
      client.sendMessage({ event: 'bp:room:subscribe', payload: { roomId } });
    }
    return () => {
      if (roomId && !cleanupDoneRef.current) {
        client.sendMessage({ event: 'bp:room:unsubscribe', payload: { roomId } });
      }
    };
  }, [client, roomId]);

  const storeConnection = useBombPartyStore((s) => s.connection);
  useEffect(() => {
    if (playerId !== storeConnection.playerId) setPlayerId(storeConnection.playerId);
    if (roomId !== storeConnection.roomId) setRoomId(storeConnection.roomId);
    const storePlayers = storeConnection.lobbyPlayers || [];
    if (storePlayers.length > 0) setLobbyPlayers(storePlayers);
    if (storeConnection.lobbyMaxPlayers) {
      setLobbyMaxPlayers(storeConnection.lobbyMaxPlayers);
    }
    const first = storePlayers[0]?.id;
    const amIHost = !!(first && storeConnection.playerId && first === storeConnection.playerId);
    if (amIHost !== storeConnection.isHost) setIsHost(amIHost);
  }, [storeConnection.playerId, storeConnection.roomId, storeConnection.lobbyPlayers, storeConnection.lobbyMaxPlayers, storeConnection.isHost, playerId, roomId, setLobbyPlayers, setLobbyMaxPlayers, setIsHost]);

  useEffect(() => {
    const checkPrimaryConnection = () => {
      const connectionsInfo = wsCoordinator.getConnectionsInfo();
      const hasPrimaryService = connectionsInfo.allConnections.some(
        c => c.type === 'bombPartyService' && c.isActive && c.id === connectionsInfo.primaryConnection
      );
      if (hasPrimaryService) {
        logger.debug('BombPartyService dejà actif, ne pas creer de connexion concurrente avec BombPartyClient');
        return false;
      }
      return true;
    };
    const connect = () => {
      if (!checkPrimaryConnection()) {
        logger.debug('Connexion BombPartyClient annulee - BombPartyService est dejà primaire');
        return;
      }

      if (!user || user.id === -1) {
        logger.debug('User is guest, skipping BombPartyClient connection');
        return;
      }

      logger.debug('Tentative de connexion WebSocket');
      client.connect();
    };
    const connectionTimer = setTimeout(connect, 100);

    const handleConnected = () => {
      setIsAuthenticating(true);
      setPlayerId(null);

      const guestId = Math.floor(Math.random() * 1000);
      const storedName = sessionStorage.getItem('bombparty_player_name');
      
      // Si l'utilisateur est connecté, ne pas utiliser un nom de guest stocké
      let playerName: string;
      if (user?.id) {
        // Utilisateur authentifié : utiliser display_name ou name, ignorer le nom stocké s'il est un guest
        if (storedName && storedName.startsWith('Guest_')) {
          sessionStorage.removeItem('bombparty_player_name');
        }
        playerName = user?.display_name || user?.name || `User_${user.id}`;
      } else {
        // Utilisateur non authentifié : utiliser le nom stocké ou générer un guest
        playerName = (storedName && storedName.trim()) || `Guest_${guestId}`;
      }

      logger.debug('Authentification avec le nom', { playerName, userId: user?.id, hasDisplayName: !!user?.display_name });
      client.authenticate(playerName);

      // Set auth timeout only when connection is actually established
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
      
      const authTimeout = setTimeout(() => {
        const currentStore = useBombPartyStore.getState();
        const hasPlayerId = playerIdRef.current !== null;
        const isInGame = currentStore.gamePhase === 'GAME' && currentStore.gameState?.phase === 'TURN_ACTIVE';

        logger.warn('Authentication timeout check', {
          isStillAuthenticating: !hasPlayerId,
          isInGame,
          hasPlayerId,
          gamePhase: currentStore.gamePhase
        });

        if (hasPlayerId) {
          logger.info('Authentication already succeeded, ignoring timeout');
          return;
        }

        const connectionsInfo = wsCoordinator.getConnectionsInfo();
        const isServicePrimary = connectionsInfo.primaryConnection &&
          connectionsInfo.allConnections.some(
            c => c.id === connectionsInfo.primaryConnection && c.type === 'bombPartyService'
          );

        if (isInGame) {
          logger.warn('Game in progress, not resetting auth - will retry later');
          setTimeout(() => {
            if (playerIdRef.current === null) {
              const retryPlayerName = user?.id 
                ? (user?.display_name || user?.name || `User_${user.id}`)
                : `Guest_${Math.floor(Math.random() * 1000)}`;
              if (isServicePrimary) {
                bombPartyService.authenticateWithName(retryPlayerName);
              } else {
                logger.warn('BombPartyService not primary, skipping authentication retry');
              }
            }
          }, 2000);
          return;
        }

        const store = useBombPartyStore.getState();
        const isConnected = store.connection.state === 'connected';

        if (!isConnected) {
          logger.warn('Authentication timeout but connection not established, skipping re-auth', {
            connectionState: store.connection.state,
            isServicePrimary
          });
          setPlayerId(null);
          setIsAuthenticating(false);
          return;
        }

        logger.warn('Authentication timeout - attempting re-auth', {
          connectionState: store.connection.state,
          isServicePrimary
        });
        setPlayerId(null);
        setIsAuthenticating(false);

        const retryPlayerName = user?.id 
          ? (user?.display_name || user?.name || `User_${user.id}`)
          : `Guest_${Math.floor(Math.random() * 1000)}`;
        if (isServicePrimary) {
          bombPartyService.authenticateWithName(retryPlayerName);
        } else {
          logger.warn('BombPartyService not primary, skipping authentication');
        }
      }, 10000) as unknown as number;

      authTimeoutRef.current = authTimeout;
    };

    const handleAuthSuccess = (payload: any) => {
      logger.info('Authentification reussie', { playerId: payload.playerId });
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
      setPlayerId(payload.playerId);
      setIsAuthenticating(false);
    };

    const handleConnectionError = () => {
      logger.error('Erreur de connexion WebSocket');
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
      logger.debug('Lobby rejoint', { payload });

      const curPlayerId = playerIdRef.current;
      const curRoomId = roomIdRef.current;

      const isAlreadyInRoom = curRoomId === payload.roomId;
      const isMyJoin = payload.playerId === curPlayerId;

      logger.debug('handleLobbyJoined debug', {
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
          logger.debug('Mise à jour du statut hôte (mon join)', {
            playerId: curPlayerId,
            firstPlayerId: firstPlayer.id,
            amIHost
          });
          setIsHost(amIHost);
        }
      } else {
        logger.debug('Message concernant un autre joueur, conservation de mon statut isHost');
      }

      setGamePhase('PLAYERS');
    };

    const handlePlayerJoined = (payload: any) => {
      logger.debug('Joueur rejoint, nouveau state', { payload });
      const curRoomId = roomIdRef.current;
      const curPlayerId = playerIdRef.current;

      if (payload.roomId === curRoomId) {
        setLobbyPlayers(payload.players || []);
        setLobbyMaxPlayers(payload.maxPlayers || 4);

        const firstPlayer = payload.players?.[0];
        if (firstPlayer && curPlayerId) {
          const isHostPlayer = firstPlayer.id === curPlayerId;
          logger.debug('Verification hôte', {
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
      logger.debug('Room state received', {
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
          logger.debug('Verification statut hôte', {
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
      setGameState({
        ...gameState!,
        phase: 'GAME_OVER',
        winner: payload.winner,
        finalStats: payload.finalStats
      } as any);
      setGamePhase('GAME_OVER');
    };

    const handleWordResult = (payload: any) => {
      setWordJustSubmitted(false);
      setTurnInProgress(false);
    };

    const handleLobbyListUpdate = (payload: any) => {
      logger.debug('Liste des lobbies mise à jour', { roomsCount: payload?.rooms?.length });
      if (payload?.rooms) {
        const store = useBombPartyStore.getState();
        store.setLobbies(payload.rooms);
      }
    };

    const handleGameCountdown = (payload: any) => {
      logger.debug('Reçu bp:game:countdown', { payload });
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
    };

    const handleGameStart = (payload: any) => {
      logger.debug('Reçu bp:game:start', { payload });
      const curRoom = roomIdRef.current;
      if (payload.roomId === curRoom) {
        logger.info('Demarrage du jeu pour la room', { roomId: payload.roomId });
        setGamePhase("GAME");
        setCountdown(0);
        setGameStartTime(Date.now());
      }
    };

    const handleGameState = (payload: any) => {
      console.log('[useBombPartyWebSocket] handleGameState appele', {
        payloadRoomId: payload?.roomId,
        payloadPhase: payload?.gameState?.phase,
        hasGameState: !!payload?.gameState
      });

      const curRoom = roomIdRef.current;
      const curPlayerId = playerIdRef.current;

      if (!payload?.roomId || payload.roomId !== curRoom) {
        console.warn('[useBombPartyWebSocket] Ignorer l\'etat du jeu pour une autre room', {
          currentRoomId: curRoom,
          payloadRoomId: payload?.roomId
        });
        logger.debug('Ignorer l\'etat du jeu pour une autre room', { currentRoomId: curRoom, payloadRoomId: payload?.roomId });
        return;
      }

      logger.debug('Mise à jour de l\'etat du jeu', {
        phase: payload.gameState.phase,
        playerId: curPlayerId,
        currentPlayerId: payload.gameState.currentPlayerId,
        currentSyllable: payload.gameState.currentSyllable
      });

      setGameState(payload.gameState);
      if (onGameStateUpdateRef.current) {
        onGameStateUpdateRef.current(payload.gameState);
      }

      if (payload.gameState.phase === "TURN_ACTIVE") {
        setGamePhase("GAME");
        setCountdown(0);
        setWordJustSubmitted(false);
        setTurnInProgress(false);
        const turnDuration = payload.gameState.turnDurationMs || (payload.gameState.baseTurnSeconds * 1000);
        const serverTurnStart = payload.gameState.turnStartedAt;

        if (serverTurnStart && turnDuration > 0) {
          setTurnStartTime(serverTurnStart);
          if (timerRef.current) {
            console.log('[useBombPartyWebSocket] Demarrage du timer', {
              serverTurnStart,
              turnDuration,
              currentTime: Date.now(),
              timerIsActive: timerRef.current.isTimerActive()
            });
            timerRef.current.startTurn(serverTurnStart, turnDuration, Date.now());
            console.log('[useBombPartyWebSocket] Timer demarre, isActive:', timerRef.current.isTimerActive());
          } else {
            console.warn('[useBombPartyWebSocket] timerRef.current est null !');
          }
          if (onTurnStartRef.current) {
            onTurnStartRef.current(serverTurnStart, turnDuration);
          }

          setTimerGracePeriod(true);
          setTimeout(() => setTimerGracePeriod(false), 5000);

          logger.debug('Tour demarre - turnStartTime initialise', {
            serverTurnStart,
            turnDuration,
            currentTime: Date.now(),
            timeOffset: Date.now() - serverTurnStart
          });
        } else {
          logger.warn('Donnees de tour invalides - turnStartTime non initialise', {
            serverTurnStart,
            turnDuration,
            phase: payload.gameState.phase
          });
        }
      }
    };

    const handleBonusApplied = (payload: any) => {
      const curRoom = roomIdRef.current;
      if (payload?.roomId === curRoom && payload?.playerId && payload?.bonusKey) {
        logger.debug('Bonus active reçu par tous les joueurs', {
          bonusKey: payload.bonusKey,
          playerId: payload.playerId,
          roomId: payload.roomId
        });

        const currentState = gameState;
        const player = currentState?.players?.find((p: any) => p.id === payload.playerId);
        const playerName = player?.name || 'Un joueur';

        setBonusNotification({ bonusKey: payload.bonusKey as BonusKey, playerName });

        if (payload.bonusKey === 'plus5sec' && payload.meta?.extendMs && timerRef.current) {
          const currentPlayerId = currentState?.players?.[currentState?.currentPlayerIndex]?.id;
          if (payload.playerId === currentPlayerId && currentState?.phase === 'TURN_ACTIVE') {
            timerRef.current.extendTurn(payload.meta.extendMs);
            setTimerFlash(true);
            setTimeout(() => setTimerFlash(false), 1000);
          }
        }
        if (payload.bonusKey === 'vitesseEclair' && payload.meta?.targetId) {
          const currentPlayerId = playerIdRef.current;
          if (payload.meta.targetId === currentPlayerId) {
            logger.debug('Vous aurez un tour rapide');
          }
        }
      }
    };

    const unsubscribeAuth = client.on('bp:auth:success', handleAuthSuccess);
    const unsubscribeCreated = client.on('bp:lobby:created', handleLobbyCreated);
    const unsubscribeJoined = client.on('bp:lobby:joined', handleLobbyJoined);
    const unsubscribePlayerJoined = client.on('bp:lobby:player_joined', handlePlayerJoined);
    const unsubscribeRoomState = client.on('bp:room:state', handleRoomState);
    const unsubscribePlayerLeft = client.on('bp:lobby:player_left', handlePlayerLeft);
    const unsubscribeLobbyList = client.on('bp:lobby:list' as any, handleLobbyListUpdate);
    const unsubscribeLobbyListUpdated = client.on('bp:lobby:list_updated' as any, handleLobbyListUpdate);
    const unsubscribeGameCountdown = client.on("bp:game:countdown", handleGameCountdown);
    const unsubscribeGameStart = client.on("bp:game:start", handleGameStart);
    const unsubscribeGameState = client.on("bp:game:state", handleGameState);
    const unsubscribeWordResult = client.on('bp:game:word_result', handleWordResult);
    const unsubscribeGameEnd = client.on('bp:game:end', handleGameEnd);
    const unsubscribeConnected = client.on('connected', handleConnected);
    const unsubscribeError = client.on('error', handleConnectionError);
    const unsubscribeBonusApplied = client.on('bp:bonus:applied' as any, handleBonusApplied);

    return () => {
      cleanupCountRef.current++;
      if (cleanupDoneRef.current) {
        if (cleanupCountRef.current > 3) {
          logger.warn('Cleanup called multiple times', {
            count: cleanupCountRef.current,
            user: user?.name
          });
        }
        return;
      }

      cleanupDoneRef.current = true;
      mountedRef.current = false;

      logger.debug('Nettoyage du client WebSocket', {
        cleanupCount: cleanupCountRef.current,
        user: user?.name
      });
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
      clearTimeout(connectionTimer);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
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
      unsubscribeBonusApplied();

      const isHotReload = import.meta.env?.DEV && import.meta.hot !== undefined;
      if (!isHotReload) {
        client.disconnect();
      }
    };
  }, [client, user]);
  useEffect(() => {
    cleanupDoneRef.current = false;
    cleanupCountRef.current = 0;
    mountedRef.current = true;

    logger.debug('Component mounted', {
      user: user?.name
    });

    return () => {
      logger.debug('Component will unmount', {
        user: user?.name,
        cleanupCount: cleanupCountRef.current
      });
    };
  }, []);

  return {
    client,
    playerId,
    roomId,
    isAuthenticating,
    setPlayerId,
    setRoomId,
    setIsAuthenticating
  };
}

