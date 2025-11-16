import { useState, useEffect, useCallback } from 'react';
import { computeRemainingTime } from './timerUtils';

export class TurnTimer {
  private turnStartedAt: number = 0;
  private turnDurationMs: number = 0;
  private isActive: boolean = false;
  private serverTimeOffset: number = 0;
  private lastSyncTime: number = 0;
  private driftHistory: number[] = [];

  startTurn(turnStartedAt: number, turnDurationMs: number, clientNow: number = Date.now()): void {
    console.log('[TurnTimer] startTurn appelé', {
      turnStartedAt,
      turnDurationMs,
      clientNow,
      serverTimeOffset: turnStartedAt - clientNow
    });
    this.turnStartedAt = turnStartedAt;
    this.turnDurationMs = turnDurationMs;
    this.serverTimeOffset = turnStartedAt - clientNow;
    this.lastSyncTime = clientNow;
    this.driftHistory = [];
    this.isActive = true;
  }

  updateServerTime(serverNow: number, clientNow: number = Date.now()): void {
    const newOffset = serverNow - clientNow;
    const drift = newOffset - this.serverTimeOffset;
    
    this.driftHistory.push(drift);
    if (this.driftHistory.length > 10) {
      this.driftHistory.shift();
    }
    
    const avgDrift = this.driftHistory.reduce((a, b) => a + b, 0) / this.driftHistory.length;
    this.serverTimeOffset += avgDrift * 0.3;
    this.lastSyncTime = clientNow;
  }

  getEstimatedDrift(): number {
    if (this.driftHistory.length === 0) return 0;
    const avgDrift = this.driftHistory.reduce((a, b) => a + b, 0) / this.driftHistory.length;
    return avgDrift;
  }

  extend(ms: number): void {
    if (!this.isActive) return;
    this.turnDurationMs += ms;
  }

  extendTurn(ms: number): void {
    this.extend(ms);
  }

  getRemainingMs(): number {
    if (!this.isActive) {
      console.warn('[TurnTimer] getRemainingMs appelé mais timer inactif', {
        isActive: this.isActive,
        turnStartedAt: this.turnStartedAt,
        turnDurationMs: this.turnDurationMs
      });
      return 0;
    }
    
    const now = Date.now();
    // log confirmant l appel vers computeRemainingTime() avec les valeurs passees
    const remaining = computeRemainingTime(
      this.turnStartedAt,
      this.turnDurationMs,
      now,
      this.serverTimeOffset
    );
    
    // log pour comprendre pourquoi remainingMs tombe a 0
    if (remaining === 0 || remaining < 0) {
      const serverNow = now + this.serverTimeOffset;
      const turnEndsAt = this.turnStartedAt + this.turnDurationMs;
      const elapsed = serverNow - this.turnStartedAt;
      console.warn('[TurnTimer] getRemainingMs retourne 0 ou négatif', {
        remaining,
        turnStartedAt: this.turnStartedAt,
        turnDurationMs: this.turnDurationMs,
        serverTimeOffset: this.serverTimeOffset,
        now,
        serverNow,
        turnEndsAt,
        elapsed,
        shouldRemain: turnEndsAt - serverNow
      });
    }
    
    if (remaining < 0 || remaining > this.turnDurationMs + 1000) {
      console.warn('[TurnTimer] getRemainingMs - Calcul suspect', {
        remaining,
        turnStartedAt: this.turnStartedAt,
        turnDurationMs: this.turnDurationMs,
        serverTimeOffset: this.serverTimeOffset
      });
    }
    
    return remaining;
  }

  isExpired(): boolean {
    return this.getRemainingMs() <= 0;
  }

  stop(): void {
    this.isActive = false;
  }

  isTimerActive(): boolean {
    return this.isActive;
  }
}

export function useTurnTimer(timer: TurnTimer, isActive: boolean) {
  const [remainingMs, setRemainingMs] = useState(0);

  const updateTimer = useCallback(() => {
    // log au debut de updateTimer
    console.log('[useTurnTimer] updateTimer appelé', {
      isActive,
      timerIsActive: timer.isTimerActive(),
      turnStartedAt: (timer as any).turnStartedAt,
      turnDurationMs: (timer as any).turnDurationMs
    });
    
    if (isActive) {
      const remaining = timer.getRemainingMs();
      const finalRemaining = Math.max(0, remaining);
      
      // log pour comprendre pourquoi remainingMs tombe a 0
      if (finalRemaining === 0 && timer.isTimerActive()) {
        console.warn('[useTurnTimer] Timer actif mais remaining = 0', {
          isActive,
          timerIsActive: timer.isTimerActive(),
          remaining,
          finalRemaining
        });
      }
      
      setRemainingMs(finalRemaining);
    } else {
      setRemainingMs(0);
    }
  }, [timer, isActive]);

  useEffect(() => {
    if (!isActive) {
      setRemainingMs(0);
      return;
    }

    updateTimer();

    const interval = setInterval(updateTimer, 100);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, updateTimer]);

  return remainingMs;
}
