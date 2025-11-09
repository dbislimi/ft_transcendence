import { useState, useEffect, useCallback } from 'react';

export class TurnTimer {
  private turnStartedAt: number = 0; // Timestamp serveur (Date.now())
  private turnDurationMs: number = 0;
  private isActive: boolean = false;
  private serverTimeOffset: number = 0; // Offset pour synchroniser avec le serveur
  private lastSyncTime: number = 0; // Dernière synchronisation
  private driftHistory: number[] = []; // Historique des dérives pour correction

  /**
   * Démarre le timer avec les valeurs du serveur
   * @param turnStartedAt Timestamp serveur du début du tour (Date.now() côté serveur)
   * @param turnDurationMs Durée du tour en millisecondes
   * @param clientNow Timestamp client actuel (Date.now() côté client)
   */
  startTurn(turnStartedAt: number, turnDurationMs: number, clientNow: number = Date.now()): void {
    this.turnStartedAt = turnStartedAt;
    this.turnDurationMs = turnDurationMs;
    // Calculer l'offset entre le serveur et le client pour synchronisation
    this.serverTimeOffset = turnStartedAt - clientNow;
    this.lastSyncTime = clientNow;
    this.driftHistory = [];
    this.isActive = true;
  }

  /**
   * Met à jour l'offset de synchronisation avec le serveur
   * @param serverNow Timestamp serveur actuel
   * @param clientNow Timestamp client actuel
   */
  updateServerTime(serverNow: number, clientNow: number = Date.now()): void {
    const newOffset = serverNow - clientNow;
    const drift = newOffset - this.serverTimeOffset;
    
    // Enregistrer la dérive pour calculer une moyenne
    this.driftHistory.push(drift);
    if (this.driftHistory.length > 10) {
      this.driftHistory.shift();
    }
    
    // Appliquer une correction progressive pour éviter les sauts brusques
    const avgDrift = this.driftHistory.reduce((a, b) => a + b, 0) / this.driftHistory.length;
    this.serverTimeOffset += avgDrift * 0.3; // Correction progressive (30%)
    this.lastSyncTime = clientNow;
  }

  /**
   * Obtient la dérive estimée basée sur l'historique
   */
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
    if (!this.isActive) return 0;
    // Utiliser Date.now() pour être cohérent avec le serveur
    const clientNow = Date.now();
    
    // Appliquer une correction de dérive basée sur l'historique
    const timeSinceLastSync = clientNow - this.lastSyncTime;
    const estimatedDrift = this.getEstimatedDrift();
    const driftCorrection = (timeSinceLastSync / 1000) * estimatedDrift; // Dérive par seconde
    
    const serverNow = clientNow + this.serverTimeOffset + driftCorrection;
    const turnEndsAt = this.turnStartedAt + this.turnDurationMs;
    return Math.max(0, turnEndsAt - serverNow);
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
    if (isActive) {
      setRemainingMs(timer.getRemainingMs());
    }
  }, [timer, isActive]);

  useEffect(() => {
    if (!isActive) {
      setRemainingMs(0);
      return;
    }

    updateTimer();

    const interval = setInterval(updateTimer, 200);

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
