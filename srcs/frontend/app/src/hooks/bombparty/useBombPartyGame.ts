import { useState, useCallback, useEffect, useRef } from 'react';
import { BombPartyEngine } from '../../game-bomb-party/core/engine';
import { TurnTimer } from '../../game-bomb-party/core/timer';
import { bombPartyStatsService } from '../../services/bombPartyStatsService';
import { bombPartyService } from '../../services/bombPartyService';
import { useBombPartyStore } from '../../store/useBombPartyStore';
import type { GameConfig, BonusKey } from '../../game-bomb-party/core/types';

export interface UseBombPartyGameReturn {
  engine: BombPartyEngine;
  timer: TurnTimer;
  gameState: any;
  wordJustSubmitted: boolean;
  turnInProgress: boolean;
  timerGracePeriod: boolean;
  turnStartTime: number;
  timerFlash: boolean;
  gameStartTime: number | null;
  bonusNotification: { bonusKey: BonusKey; playerName: string } | null;
  setGameState: (state: any) => void;
  setWordJustSubmitted: (value: boolean) => void;
  setTurnInProgress: (value: boolean) => void;
  setTimerGracePeriod: (value: boolean) => void;
  setTurnStartTime: (time: number) => void;
  setTimerFlash: (value: boolean) => void;
  setGameStartTime: (time: number | null) => void;
  setBonusNotification: (notification: { bonusKey: BonusKey; playerName: string } | null) => void;
  handleWordSubmit: (word: string, gameMode: 'local' | 'multiplayer', roomId: string | null, playerId: string | null, client: any) => void;
  handleActivateBonus: (bonusKey: BonusKey, gameMode: 'local' | 'multiplayer', roomId: string | null, playerId: string | null, client: any) => boolean;
  startGame: (config: GameConfig, gameMode: 'local' | 'multiplayer', roomId: string | null, client: any) => void;
  resetGame: () => void;
  isCurrentPlayerTurn: (gameMode: 'local' | 'multiplayer', playerId: string | null) => boolean;
}

export function useBombPartyGame(user: any) {
  const [engine] = useState(() => new BombPartyEngine());
  const [timer] = useState(() => new TurnTimer());
  const [gameState, setGameState] = useState(engine.getState());
  const [wordJustSubmitted, setWordJustSubmitted] = useState(false);
  const [turnInProgress, setTurnInProgress] = useState(false);
  const [timerGracePeriod, setTimerGracePeriod] = useState(false);
  const [turnStartTime, setTurnStartTime] = useState(0);
  const [timerFlash, setTimerFlash] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [bonusNotification, setBonusNotification] = useState<{ bonusKey: BonusKey; playerName: string } | null>(null);

  const gamePhase = useBombPartyStore((state) => state.gamePhase);
  const playerId = useBombPartyStore ((state) => state.connection.playerId);
  const setGamePhase = useBombPartyStore((state) => state.setGamePhase);
  const storeGameState = useBombPartyStore((state) => state.gameState);
  const gameMode = useBombPartyStore((state) => state.gameMode);

  useEffect(() => {
    if (gameMode === 'multiplayer' && storeGameState && storeGameState !== gameState) {
      setGameState(storeGameState);
    }
  }, [storeGameState, gameMode, gameState]);

  const previousTurnStartedAtRef = useRef<number | undefined>(undefined);
  
  useEffect(() => {
    if (gameMode === 'multiplayer' && gameState.phase === 'TURN_ACTIVE' && gameState.turnStartedAt) {
      const newTurnStartedAt = gameState.turnStartedAt;
      const previousTurnStartedAt = previousTurnStartedAtRef.current;
      
      const isNewTurn = previousTurnStartedAt !== undefined && previousTurnStartedAt !== newTurnStartedAt;
      const needsInitialization = turnStartTime === 0 || turnStartTime !== newTurnStartedAt;
      
      if (needsInitialization) {
        console.log('[useBombPartyGame] 🎯 Mise à jour de turnStartTime', {
          turnStartedAt: newTurnStartedAt,
          currentTurnStartTime: turnStartTime,
          previousTurnStartedAt,
          isNewTurn,
          isInitialization: turnStartTime === 0,
          currentTime: Date.now(),
          diff: Date.now() - newTurnStartedAt,
          currentPlayer: gameState.players[gameState.currentPlayerIndex]?.name
        });
        
        setTurnStartTime(newTurnStartedAt);
        previousTurnStartedAtRef.current = newTurnStartedAt;
        
        // Démarrer le timer en mode multijoueur
        const turnDuration = gameState.turnDurationMs || (gameState.baseTurnSeconds * 1000) || 12000;
        if (turnDuration > 0) {
          console.log('[useBombPartyGame] Démarrage du timer', {
            turnStartedAt: newTurnStartedAt,
            turnDuration,
            currentTime: Date.now(),
            timerIsActive: timer.isTimerActive()
          });
          timer.startTurn(newTurnStartedAt, turnDuration, Date.now());
          console.log('[useBombPartyGame] Timer démarré, isActive:', timer.isTimerActive());
        }
      }
    }
    
    if (gameMode === 'local' && gameState.phase === 'TURN_ACTIVE') {
      if (turnStartTime === 0) {
        const now = Date.now();
        console.log('[useBombPartyGame] Initialisation de turnStartTime en mode local', {
          time: now,
          currentPlayer: gameState.players[gameState.currentPlayerIndex]?.name
        });
        setTurnStartTime(now);
      }
    }
    
    if (gameState.phase !== 'TURN_ACTIVE') {
      previousTurnStartedAtRef.current = undefined;
      
      // Arrêter le timer si la phase n'est plus TURN_ACTIVE
      if (timer.isTimerActive()) {
        console.log('[useBombPartyGame] Arrêt du timer - phase changée', {
          oldPhase: 'TURN_ACTIVE',
          newPhase: gameState.phase
        });
        timer.stop();
      }
      
      if (turnStartTime > 0 && (gameState.phase === 'RESOLVE' || gameState.phase === 'GAME_OVER')) {
        console.log('[useBombPartyGame] Phase changée, conservation de turnStartTime pour traçabilité', {
          oldPhase: 'TURN_ACTIVE',
          newPhase: gameState.phase,
          turnStartTime,
          serverTurnStartedAt: gameState.turnStartedAt
        });
      }
    }
  }, [gameMode, gameState.phase, gameState.turnStartedAt, gameState.currentPlayerIndex, gameState.players, gameState.turnDurationMs, gameState.baseTurnSeconds, turnStartTime, timer]);

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

      const stats = bombPartyStatsService.calculateGameStats(
        gameData, 
        playerId, 
        user?.id || 'local'
      );
      
      const player = gameState.players.find(p => p.id === playerId);
      const playerName = player?.name || `Guest_${playerId}`;
      
      console.log('[useBombPartyGame] Sauvegarde stats:', {
        userId: user?.id,
        userObject: user,
        hasToken: !!localStorage.getItem('token'),
        stats: stats
      });
      
      bombPartyStatsService.saveGameStats({
        ...stats,
        playerName: playerName
      }).catch(error => {
        console.error('Erreur sauvegarde statistiques:', error);
      });
      
      const redirectTimer = setTimeout(() => {
        console.log("[useBombPartyGame] Partie terminée, redirection vers l'écran d'accueil");
        alert("Partie terminée. Retour à l'écran d'accueil...");
        setGamePhase('RULES');
      }, 5000);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [gameState.phase, gameStartTime, playerId, gameState.players, gameState.history, gameState.usedWords, setGamePhase, user]);

  const handleWordSubmit = useCallback((word: string, gameMode: 'local' | 'multiplayer', roomId: string | null, playerId: string | null) => {
    console.log('[useBombPartyGame] handleWordSubmit called', {
      word,
      gameMode,
      roomId,
      playerId,
      turnStartTime,
      serverTurnStart: gameState.turnStartedAt
    });
    
    if (turnStartTime === 0) {
      console.error('[useBombPartyGame] ⚠️ ERREUR: turnStartTime est 0 lors de la soumission!', {
        gameMode,
        phase: gameState.phase,
        currentPlayer: gameState.players[gameState.currentPlayerIndex]?.name,
        serverTurnStartedAt: gameState.turnStartedAt,
        message: 'Le turnStartTime aurait dû être initialisé au début du tour'
      });
      if (gameState.turnStartedAt) {
        console.warn('[useBombPartyGame] 🔄 Utilisation du fallback avec gameState.turnStartedAt');
        setTurnStartTime(gameState.turnStartedAt);
      } else {
        console.error('[useBombPartyGame] ❌ ERREUR CRITIQUE: Aucun temps serveur disponible, calcul de msTaken sera incorrect', {
          gameMode,
          phase: gameState.phase,
          hasGameState: !!gameState
        });
      }
    } else if (gameState.turnStartedAt && Math.abs(turnStartTime - gameState.turnStartedAt) > 1000) {
      console.warn('[useBombPartyGame] ⚠️ Désynchronisation détectée, resynchronisation avec le serveur', {
        turnStartTime,
        serverTurnStartedAt: gameState.turnStartedAt,
        diff: Math.abs(turnStartTime - gameState.turnStartedAt),
        gameMode,
        phase: gameState.phase
      });
      setTurnStartTime(gameState.turnStartedAt);
    }
    
    setWordJustSubmitted(true);
    setTurnInProgress(true);
    
    const responseTime = turnStartTime > 0 ? Date.now() - turnStartTime : 0;
    bombPartyStatsService.recordTrigramAttempt(gameState.currentSyllable, true, responseTime);

    if (gameMode === 'local') {
      const msTaken = Date.now() - turnStartTime;
      const result = engine.submitWord(word, msTaken);
      
      if (result.ok) {
        engine.resolveTurn(true, false);
        const newState = engine.getState();
        setGameState(newState);
        
        if (!engine.isGameOver()) {
          setTimeout(() => {
            const updatedState = engine.getState();
            const newTurnStart = updatedState.turnStartedAt || Date.now();
            const newTurnDuration = updatedState.turnDurationMs || 15000;
            setTurnStartTime(newTurnStart);
            setGameState(updatedState);
            
            // Redémarrer le timer pour le nouveau tour
            if (timer && newTurnStart && newTurnDuration) {
              timer.startTurn(newTurnStart, newTurnDuration, Date.now());
            }
            
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
              const updatedState = engine.getState();
              const newTurnStart = updatedState.turnStartedAt || Date.now();
              const newTurnDuration = updatedState.turnDurationMs || 15000;
              setTurnStartTime(newTurnStart);
              setGameState(updatedState);
              
              // Redémarrer le timer pour le nouveau tour
              if (timer && newTurnStart && newTurnDuration) {
                timer.startTurn(newTurnStart, newTurnDuration, Date.now());
              }
              
              setTurnInProgress(false);
              setWordJustSubmitted(false);
            }, 500);
          }
        }
      }
    } else {
      if (!roomId || !playerId) {
        console.error('[useBombPartyGame] Missing roomId or playerId in multiplayer mode', {
          roomId,
          playerId
        });
        setWordJustSubmitted(false);
        setTurnInProgress(false);
        return;
      }
      
      let msTaken = 0;
      const clientNow = Date.now();
      
      if (turnStartTime > 0) {
        msTaken = clientNow - turnStartTime;
        
        if (gameState.turnStartedAt && Math.abs(turnStartTime - gameState.turnStartedAt) > 1000) {
          console.warn('[useBombPartyGame] ⚠️ turnStartTime désynchronisé du serveur, utilisation du temps serveur', {
            turnStartTime,
            serverTurnStartedAt: gameState.turnStartedAt,
            diff: Math.abs(turnStartTime - gameState.turnStartedAt)
          });
          msTaken = clientNow - gameState.turnStartedAt;
        }
      } else if (gameState.turnStartedAt) {
        msTaken = clientNow - gameState.turnStartedAt;
        console.warn('[useBombPartyGame] ⚠️ turnStartTime est 0, utilisation de gameState.turnStartedAt', {
          turnStartedAt: gameState.turnStartedAt,
          msTaken,
          clientNow
        });
      } else {
        console.error('[useBombPartyGame] ❌ ERREUR CRITIQUE: Impossible de calculer msTaken', {
          turnStartTime,
          serverTurnStartedAt: gameState.turnStartedAt,
          phase: gameState.phase
        });
        msTaken = 0;
      }
      
      if (msTaken < 0) {
        console.error('[useBombPartyGame] ❌ msTaken négatif détecté, correction à 0', {
          msTaken,
          turnStartTime,
          serverTurnStartedAt: gameState.turnStartedAt,
          clientNow
        });
        msTaken = 0;
      }
      
      if (msTaken > gameState.turnDurationMs + 2000) {
        console.warn('[useBombPartyGame] ⚠️ msTaken suspect (trop grand), limitation', {
          msTaken,
          turnDurationMs: gameState.turnDurationMs,
          turnStartTime,
          serverTurnStartedAt: gameState.turnStartedAt
        });
        msTaken = Math.min(msTaken, gameState.turnDurationMs + 1000);
      }
      
      console.log('[useBombPartyGame] ✅ Submitting word in multiplayer', {
        word,
        msTaken,
        turnStartTime,
        serverTurnStart: gameState.turnStartedAt,
        clientNow,
        timeOffset: clientNow - (gameState.turnStartedAt || 0),
        roomId,
        playerId,
        turnDurationMs: gameState.turnDurationMs
      });
      
      try {
        bombPartyService.submitWord(word, msTaken);
        console.log('[useBombPartyGame] Word submitted to server');
      } catch (error) {
        console.error('[useBombPartyGame] Error submitting word', error);
        setWordJustSubmitted(false);
        setTurnInProgress(false);
      }
    }
  }, [engine, turnStartTime, gameState.currentSyllable]);

  const handleActivateBonus = useCallback((bonusKey: BonusKey, gameMode: 'local' | 'multiplayer', roomId: string | null, playerId: string | null) => {
    if (gameMode === 'local') {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (!currentPlayer) return false;
      const result = engine.activateBonus(currentPlayer.id, bonusKey);
      if (result.ok) {
        const newState = engine.getState();
        setGameState(newState);
        
        setBonusNotification({ bonusKey, playerName: currentPlayer.name });
        
        if (bonusKey === 'plus5sec' && result.meta?.extendMs) {
          timer.extendTurn(result.meta.extendMs);
          setTimerFlash(true);
          setTimeout(() => setTimerFlash(false), 1000);
        }
      }
      return result.ok;
    } else {
      if (!roomId || !playerId) {
        console.error('Pas de roomId ou playerId pour activer le bonus');
        return false;
      }
      bombPartyService.activateBonus(bonusKey);
      return true;
    }
  }, [engine, gameState, timer]);

  const startGame = useCallback((config: GameConfig, gameMode: 'local' | 'multiplayer', roomId: string | null) => {
    console.log('startGame appelé avec config:', config);
    
    setGameStartTime(Date.now());
    
    if (gameMode === 'local') {
      engine.startGame(config);
      setGameState(engine.getState());
      setGamePhase('GAME');
      setTurnStartTime(Date.now());
    } else {
      if (!roomId) {
        console.log('Pas de roomId pour démarrer le jeu');
        return;
      }
      console.log('Envoi de bp:lobby:start au serveur');
      bombPartyService.startGame();
    }
  }, [engine, setGamePhase]);

  const resetGame = useCallback(() => {
    engine.reset();
    timer.stop();
    setGameState(engine.getState());
    setGamePhase('RULES');
  }, [engine, timer, setGamePhase]);

  const isCurrentPlayerTurn = useCallback((gameMode: 'local' | 'multiplayer', playerId: string | null) => {
    if (gameMode === 'local') {
      return gameState.phase === 'TURN_ACTIVE';
    }
    if (!playerId || !gameState.players.length) {
      return false;
    }
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isTurn = currentPlayer && currentPlayer.id === playerId;
    
    return isTurn;
  }, [gameState.players, gameState.currentPlayerIndex, gameState.phase]);

  return {
    engine,
    timer,
    gameState,
    wordJustSubmitted,
    turnInProgress,
    timerGracePeriod,
    turnStartTime,
    timerFlash,
    gameStartTime,
    bonusNotification,
    setGameState,
    setWordJustSubmitted,
    setTurnInProgress,
    setTimerGracePeriod,
    setTurnStartTime,
    setTimerFlash,
    setGameStartTime,
    setBonusNotification,
    handleWordSubmit,
    handleActivateBonus,
    startGame,
    resetGame,
    isCurrentPlayerTurn
  };
}

