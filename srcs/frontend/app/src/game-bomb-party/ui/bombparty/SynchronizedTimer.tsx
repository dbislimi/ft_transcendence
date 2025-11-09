import React, { useState, useEffect, useRef, memo } from 'react';
import { TurnTimer } from '../core/timer';

interface SynchronizedTimerProps {
  timer: TurnTimer;
  isActive: boolean;
  totalDurationMs: number;
  className?: string;
  showBar?: boolean;
  showNumeric?: boolean;
  onExpire?: () => void;
}

/**
 * Composant de timer synchronisé avec le serveur
 * Affiche le temps restant avec correction de drift automatique
 */
export const SynchronizedTimer: React.FC<SynchronizedTimerProps> = memo(({
  timer,
  isActive,
  totalDurationMs,
  className = '',
  showBar = true,
  showNumeric = true,
  onExpire
}) => {
  const [remainingMs, setRemainingMs] = useState(0);
  const [driftCorrection, setDriftCorrection] = useState(0);
  const lastSyncRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number>();

  // Synchronisation périodique avec correction de drift
  useEffect(() => {
    if (!isActive) {
      setRemainingMs(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    let lastUpdate = performance.now();
    const updateInterval = 50; // Mise à jour toutes les 50ms pour fluidité

    const updateTimer = () => {
      const now = performance.now();
      const elapsed = now - lastUpdate;

      if (elapsed >= updateInterval) {
        const remaining = timer.getRemainingMs();
        setRemainingMs(remaining);

        // Détection de drift : si le temps restant est négatif ou très différent de l'attendu
        const expectedElapsed = Date.now() - lastSyncRef.current;
        const actualRemaining = totalDurationMs - expectedElapsed;
        const drift = remaining - actualRemaining;

        if (Math.abs(drift) > 100) { // Drift de plus de 100ms
          setDriftCorrection(drift);
          // Correction automatique après 1 seconde de drift
          if (Math.abs(drift) > 500) {
            timer.updateServerTime(Date.now() - drift, Date.now());
            lastSyncRef.current = Date.now();
          }
        }

        if (remaining <= 0 && onExpire) {
          onExpire();
        }

        lastUpdate = now;
      }

      animationFrameRef.current = requestAnimationFrame(updateTimer);
    };

    animationFrameRef.current = requestAnimationFrame(updateTimer);
    lastSyncRef.current = Date.now();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, timer, totalDurationMs, onExpire]);

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(Math.max(0, ms) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    if (totalDurationMs <= 0) return 0;
    return Math.max(0, Math.min(1, remainingMs / totalDurationMs));
  };

  const getTimerColor = (): string => {
    const progress = getProgress();
    if (progress <= 0.2) return 'text-red-500';
    if (progress <= 0.4) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getBarColor = (): string => {
    const progress = getProgress();
    if (progress <= 0.2) return 'bg-red-500';
    if (progress <= 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className={`synchronized-timer ${className}`}>
      {showNumeric && (
        <div className={`text-center ${getTimerColor()}`}>
          <div className="text-4xl font-bold tabular-nums">
            {formatTime(remainingMs)}
          </div>
          {Math.abs(driftCorrection) > 100 && (
            <div className="text-xs text-gray-400 mt-1">
              {driftCorrection > 0 ? '+' : ''}{Math.round(driftCorrection)}ms
            </div>
          )}
        </div>
      )}
      
      {showBar && (
        <div className="mt-2">
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${getBarColor()}`}
              style={{ width: `${getProgress() * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1 text-center">
            {Math.round(getProgress() * 100)}%
          </div>
        </div>
      )}
    </div>
  );
});

SynchronizedTimer.displayName = 'SynchronizedTimer';

