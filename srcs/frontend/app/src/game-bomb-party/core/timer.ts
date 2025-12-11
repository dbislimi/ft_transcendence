import { useState, useEffect, useCallback, useRef } from 'react';
import { computeRemainingTime } from './timerUtils';

export class TurnTimer {
  private turnStartedAt: number = 0;
  private turnDurationMs: number = 0;
  private isActive: boolean = false;
  private serverTimeOffset: number = 0;
  private lastSyncTime: number = 0;
  private driftHistory: number[] = [];

  startTurn(turnStartedAt: number, turnDurationMs: number, clientNow: number = Date.now()): void {
    console.log('[TurnTimer] startTurn appele', {
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
      console.warn('[TurnTimer] getRemainingMs appele mais timer inactif', {
        isActive: this.isActive,
        turnStartedAt: this.turnStartedAt,
        turnDurationMs: this.turnDurationMs
      });
      return 0;
    }
    
    const now = Date.now();
    const remaining = computeRemainingTime(
      this.turnStartedAt,
      this.turnDurationMs,
      now,
      this.serverTimeOffset
    );
    
    if (remaining === 0 || remaining < 0) {
      const serverNow = now + this.serverTimeOffset;
      const turnEndsAt = this.turnStartedAt + this.turnDurationMs;
      const elapsed = serverNow - this.turnStartedAt;
      console.warn('[TurnTimer] getRemainingMs retourne 0 ou negatif', {
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
  const zeroCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateTimer = useCallback(() => {
    console.log('[useTurnTimer] updateTimer appele', {
      isActive,
      timerIsActive: timer.isTimerActive(),
      turnStartedAt: (timer as any).turnStartedAt,
      turnDurationMs: (timer as any).turnDurationMs
    });
    
    if (isActive) {
      const remaining = timer.getRemainingMs();
      const finalRemaining = Math.max(0, remaining);
      
      if (finalRemaining === 0) {
        zeroCountRef.current++;
        
        if (zeroCountRef.current > 5) {
          console.warn('[useTurnTimer] Boucle infinie detectee - arret force du timer', {
            zeroCount: zeroCountRef.current,
            isActive,
            timerIsActive: timer.isTimerActive()
          });
          
          timer.stop();
          
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          
          setRemainingMs(0);
          return;
        }
        
        console.warn('[useTurnTimer] Timer actif mais remaining = 0', {
          isActive,
          timerIsActive: timer.isTimerActive(),
          remaining,
          finalRemaining,
          zeroCount: zeroCountRef.current
        });
      } else {
        zeroCountRef.current = 0;
      }
      
      setRemainingMs(finalRemaining);
    } else {
      setRemainingMs(0);
      zeroCountRef.current = 0;
    }
  }, [timer, isActive]);

  useEffect(() => {
    if (!isActive) {
      setRemainingMs(0);
      zeroCountRef.current = 0;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    updateTimer();

    intervalRef.current = setInterval(updateTimer, 100);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, updateTimer]);

  return remainingMs;
}
