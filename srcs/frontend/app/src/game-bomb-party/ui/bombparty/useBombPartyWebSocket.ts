import { useEffect, useRef } from 'react';
import { BombPartyClient } from '../../../services/ws/bombPartyClient';
import { useBombPartyStore } from '../../../store/useBombPartyStore';
import { TurnTimer } from '../../core/timer';
import type { BonusKey } from '../../core/types';
import { timerService } from '../../../services/timerService';

interface UseBombPartyWebSocketOptions {
  client: BombPartyClient;
  timer: TurnTimer;
  user: any;
}

export function useBombPartyWebSocket({ client, timer, user }: UseBombPartyWebSocketOptions) {
  const store = useBombPartyStore();
  const timerRef = useRef(timer);
  const countdownIntervalRef = useRef<number | null>(null);
  const cleanupDoneRef = useRef<boolean>(false);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    const roomId = store.connection.roomId;
    if (roomId) {
      client.sendMessage({ event: 'bp:room:subscribe', payload: { roomId } });
    }
    return () => {
      if (roomId && !cleanupDoneRef.current) {
        client.sendMessage({ event: 'bp:room:unsubscribe', payload: { roomId } });
      }
    };
  }, [client, store.connection.roomId]);

  useEffect(() => {
    const connectionTimerId = timerService.setTimeout(() => {
      client.connect();
    }, 100);

    const handleConnected = () => {
      store.setIsAuthenticating(true);
      store.setPlayerId(null);

      const guestId = Math.floor(Math.random() * 1000);
      const storedName = sessionStorage.getItem('bombparty_player_name');

      let playerName: string;
      if (user?.id) {
        if (storedName && storedName.startsWith('Guest_')) {
          sessionStorage.removeItem('bombparty_player_name');
        }
        playerName = user?.display_name || user?.name || `User_${user.id}`;
      } else {
        playerName = (storedName && storedName.trim()) || `Guest_${guestId}`;
      }

      client.authenticate(playerName);
    };

    const handleAuthSuccess = (payload: any) => {
      store.setPlayerId(payload.playerId);
      store.setIsAuthenticating(false);
    };

    const handleConnectionError = () => {
      store.setPlayerId(null);
      store.setIsAuthenticating(false);
    };

    const handleLobbyCreated = (payload: any) => {
      store.setRoomId(payload.roomId);
      store.setLobbyMaxPlayers(payload.maxPlayers || 4);
      store.setIsHost(true);
      store.setGamePhase('PLAYERS');
    };

    const handleLobbyJoined = (payload: any) => {
      const curPlayerId = store.connection.playerId;
      const isMyJoin = payload.playerId === curPlayerId;

      store.setRoomId(payload.roomId);
      store.setLobbyMaxPlayers(payload.maxPlayers || 4);
      store.setLobbyPlayers(payload.players || []);

      if (isMyJoin && payload.players && payload.players.length > 0 && curPlayerId) {
        const firstPlayer = payload.players[0];
        const amIHost = firstPlayer.id === curPlayerId;
        store.setIsHost(amIHost);
      }

      store.setGamePhase('PLAYERS');
    };

    const handlePlayerJoined = (payload: any) => {
      const curRoomId = store.connection.roomId;
      const curPlayerId = store.connection.playerId;

      if (payload.roomId === curRoomId) {
        store.setLobbyPlayers(payload.players || []);
        store.setLobbyMaxPlayers(payload.maxPlayers || 4);

        const firstPlayer = payload.players?.[0];
        if (firstPlayer && curPlayerId) {
          const isHostPlayer = firstPlayer.id === curPlayerId;
          store.setIsHost(isHostPlayer);
        }
      }
    };

    const handlePlayerLeft = (payload: any) => {
      store.setLobbyPlayers(payload.players || []);
    };

    const handleRoomState = (payload: any) => {
      if (payload.roomId && payload.roomId !== store.connection.roomId) {
        store.setRoomId(payload.roomId);
      }

      if (!store.connection.roomId || payload.roomId === store.connection.roomId) {
        store.setLobbyPlayers(payload.players || []);
        store.setLobbyMaxPlayers(payload.maxPlayers || 4);

        const firstPlayer = payload.players?.[0];
        if (firstPlayer && store.connection.playerId) {
          const isHostPlayer = firstPlayer.id === store.connection.playerId;
          store.setIsHost(isHostPlayer);
        }
      }
    };

    const handleGameEnd = (payload: any) => {
      console.log('[useBombPartyWebSocket] Jeu termine - nettoyage du timer');

      if (timerRef.current) {
        timerRef.current.stop();
      }

      if (countdownIntervalRef.current) {
        timerService.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      const currentState = store.gameState;
      if (currentState) {
        store.receiveServerState({
          ...currentState,
          phase: 'GAME_OVER',
          winner: payload.winner,
          finalStats: payload.finalStats
        } as any);
      }
      store.setGamePhase('GAME_OVER');

      store.setWordJustSubmitted(false);
      store.setTurnInProgress(false);
      store.setTimerGracePeriod(false);
    };

    const handleWordResult = (payload: any) => {
      store.setWordJustSubmitted(false);
      store.setTurnInProgress(false);
    };

    const authTimeoutId = timerService.setTimeout(() => {
      const currentState = useBombPartyStore.getState();
      const isStillAuthenticating = currentState.connection.isAuthenticating && !currentState.connection.playerId;
      const isInGame = currentState.gamePhase === 'GAME' && currentState.gameState?.phase === 'TURN_ACTIVE';

      if (!isStillAuthenticating) {
        return;
      }

      if (isInGame) {
        timerService.setTimeout(() => {
          const latestState = useBombPartyStore.getState();
          if (!latestState.connection.playerId) {
            client.authenticate(user?.name || `Guest_${Math.floor(Math.random() * 1000)}`);
          }
        }, 2000);
        return;
      }

      store.setPlayerId(null);
      store.setIsAuthenticating(false);
      client.authenticate(user?.name || `Guest_${Math.floor(Math.random() * 1000)}`);
    }, 10000);

    const handleLobbyListUpdate = (payload: any) => {
      if (payload?.rooms) {
        store.setLobbies(payload.rooms);
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

    const unsubscribeGameCountdown = client.on("bp:game:countdown", (payload: any) => {
      const curRoom = store.connection.roomId;
      if (!payload?.roomId || payload.roomId !== curRoom) return;

      const startTime = payload.startTime ?? Date.now();
      const duration = payload.countdownDuration ?? 3000;
      const update = () => {
        const now = Date.now();
        const remainingMs = Math.max(0, startTime + duration - now);
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        store.setCountdown(remainingSeconds);
      };

      store.setGamePhase("GAME");
      update();
      if (countdownIntervalRef.current) {
        timerService.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      const countdownIntervalId = timerService.setInterval(() => {
        update();
        if (Date.now() >= startTime + duration) {
          if (countdownIntervalRef.current) {
            timerService.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          store.setCountdown(0);
        }
      }, 100);
      countdownIntervalRef.current = countdownIntervalId;
    });

    const unsubscribeGameStart = client.on("bp:game:start", (payload: any) => {
      const curRoom = store.connection.roomId;
      if (payload.roomId === curRoom) {
        store.setGamePhase("GAME");
        store.setCountdown(0);
        store.setGameStartTime(Date.now());
      }
    });

    const unsubscribeGameState = client.on("bp:game:state", (payload: any) => {
      const curRoom = store.connection.roomId;
      const curPlayerId = store.connection.playerId;

      if (!payload?.roomId || payload.roomId !== curRoom) {
        return;
      }

      const oldState = store.gameState;

      const turnStarted = payload.turnStarted;

      const gameState = payload.gameState || (payload.delta?.full ? payload.delta.gameState : null);
      if (!gameState) {
        return;
      }

      if (oldState && oldState.players.length === gameState.players.length) {
        gameState.players.forEach((newPlayer: any, idx: number) => {
          const oldPlayer = oldState.players[idx];
          if (oldPlayer && oldPlayer.lives !== newPlayer.lives) {
            const optimisticLoss = store.optimisticLifeLoss;
            if (optimisticLoss && optimisticLoss.playerId === newPlayer.id) {
              store.setOptimisticLifeLoss(null);
            }
          }
        });
      }

      store.receiveServerState(gameState);

      const turnStartInfo = turnStarted || (gameState.phase === "TURN_ACTIVE" ? {
        turnStartedAt: gameState.turnStartedAt,
        turnDurationMs: gameState.turnDurationMs || (gameState.baseTurnSeconds * 1000),
        currentPlayerId: gameState.currentPlayerId
      } : null);

      if (turnStartInfo && gameState.phase === "TURN_ACTIVE") {
        store.setGamePhase("GAME");
        store.setCountdown(0);
        store.setWordJustSubmitted(false);
        store.setTurnInProgress(false);

        const turnDuration = turnStartInfo.turnDurationMs || gameState.turnDurationMs || (gameState.baseTurnSeconds * 1000);
        const serverTurnStart = turnStartInfo.turnStartedAt || gameState.turnStartedAt;
        const clientNow = Date.now();
        const currentTurnStartTime = store.turnStartTime;

        if (serverTurnStart && turnDuration > 0) {
          const isNewTurn = currentTurnStartTime !== serverTurnStart;
          const isTimerActive = timerRef.current.isTimerActive();

          const needsResync = isNewTurn ||
            !isTimerActive ||
            Math.abs(currentTurnStartTime - serverTurnStart) > 500;

          if (needsResync) {
            console.log('[useBombPartyWebSocket] Demarrage du timer', {
              serverTurnStart,
              turnDuration,
              clientNow
            });
            timerRef.current.startTurn(serverTurnStart, turnDuration, clientNow);
            store.setTurnStartTime(serverTurnStart);
            store.setTimerGracePeriod(true);

            timerService.setTimeout(() => store.setTimerGracePeriod(false), 500);
          }
        } else {
          console.log('[useBombPartyWebSocket] Parametres timer invalides - arret du timer');
          timerRef.current.stop();
        }
      } else if (gameState.phase !== "TURN_ACTIVE" && timerRef.current.isTimerActive()) {
        console.log('[useBombPartyWebSocket] Phase non-active detectee - arret du timer', {
          phase: gameState.phase
        });
        timerRef.current.stop();
      } else if (gameState.phase === "GAME_OVER") {
        console.log('[useBombPartyWebSocket] GAME_OVER detecte - arret force du timer');
        timerRef.current.stop();

        if (countdownIntervalRef.current) {
          timerService.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    });

    const unsubscribeWordResult = client.on('bp:game:word_result', handleWordResult);
    const unsubscribeGameEnd = client.on('bp:game:end', handleGameEnd);
    const unsubscribeConnected = client.on('connected', handleConnected);
    const unsubscribeError = client.on('error', handleConnectionError);

    const unsubscribeBonusApplied = client.on('bp:bonus:applied' as any, (payload: any) => {
      const curRoom = store.connection.roomId;
      if (payload?.roomId === curRoom && payload?.playerId && payload?.bonusKey) {
        const currentState = store.gameState;
        const player = currentState?.players?.find((p: any) => p.id === payload.playerId);
        const playerName = player?.name || 'a player';

        store.setBonusNotification({ bonusKey: payload.bonusKey as BonusKey, playerName });

        if (payload.bonusKey === 'plus5sec' && payload.meta?.extendMs) {
          store.setTimerFlash(true);
          timerService.setTimeout(() => store.setTimerFlash(false), 1000);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('bp:bonus:applied', {
            detail: {
              roomId: payload.roomId,
              playerId: payload.playerId,
              playerName,
              bonusKey: payload.bonusKey
            }
          }));
        }
      }
    });

    return () => {
      if (cleanupDoneRef.current) {
        return;
      }

      cleanupDoneRef.current = true;

      timerService.clearTimeout(authTimeoutId);
      timerService.clearTimeout(connectionTimerId);

      if (countdownIntervalRef.current) {
        timerService.clearInterval(countdownIntervalRef.current);
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
}

