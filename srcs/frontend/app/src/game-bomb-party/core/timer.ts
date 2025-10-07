import { useState, useEffect, useCallback } from 'react';

export class TurnTimer {
  private turnEndsAt: number = 0;
  private isActive: boolean = false;

  startTurn(durationMs: number): void {
    this.turnEndsAt = performance.now() + durationMs;
    this.isActive = true;
  }

  extend(ms: number): void {
    if (!this.isActive) return;
    this.turnEndsAt += ms;
  }

  getRemainingMs(): number {
    if (!this.isActive) return 0;
    return Math.max(0, this.turnEndsAt - performance.now());
  }

  isExpired(): boolean {
    return this.getRemainingMs() <= 0;
  }

  stop(): void {
    this.isActive = false;
  }

  // Méthode publique pour vérifier si le timer est actif
  isTimerActive(): boolean {
    return this.isActive;
  }
}

export function useTurnTimer(timer: TurnTimer, isActive: boolean) {
  const [remainingMs, setRemainingMs] = useState(0);

  const updateTimer = useCallback(() => {
    if (isActive) {
      setRemainingMs(timer.getRemainingMs());
    }
  }, [timer, isActive]);

  useEffect(() => {
    if (!isActive) {
      setRemainingMs(0);
      return;
    }

    // Mise à jour initiale
    updateTimer();

    // Mise à jour toutes les 200ms (réduit de moitié la fréquence pour améliorer les performances)
    const interval = setInterval(updateTimer, 200);

    // Gestion de la visibilité de l'onglet
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
