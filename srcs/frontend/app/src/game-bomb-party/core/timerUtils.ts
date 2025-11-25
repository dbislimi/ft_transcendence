export function computeRemainingTime(
  turnStartedAt: number,
  turnDurationMs: number,
  currentTime: number = Date.now(),
  serverTimeOffset: number = 0
): number {
  // log tous les appels pour debug
  console.log('[computeRemainingTime] Appeler', {
    turnStartedAt,
    turnDurationMs,
    currentTime,
    serverTimeOffset,
    turnStartedAtValid: !!turnStartedAt,
    turnDurationMsValid: !!turnDurationMs
  });
  
  if (!turnStartedAt || !turnDurationMs) {
    // log si parametres invalides
    console.warn('[computeRemainingTime] parametres invalides', {
      turnStartedAt,
      turnDurationMs,
      currentTime,
      serverTimeOffset,
      turnStartedAtFalsy: !turnStartedAt,
      turnDurationMsFalsy: !turnDurationMs
    });
    return 0;
  }
  
  const serverNow = currentTime + serverTimeOffset;
  const turnEndsAt = turnStartedAt + turnDurationMs;
  const calculatedRemaining = turnEndsAt - serverNow;
  const remaining = Math.max(0, calculatedRemaining);
  
  // log si remaining=0 mais calculatedRemaining > 0 (bug potentiel)
  if (remaining === 0 && calculatedRemaining > 0) {
    console.error('[computeRemainingTime] BUG DÉTECTÉ - remaining=0 mais calculatedRemaining > 0', {
      turnStartedAt,
      turnDurationMs,
      currentTime,
      serverTimeOffset,
      serverNow,
      turnEndsAt,
      calculatedRemaining,
      remaining,
      mathMaxResult: Math.max(0, calculatedRemaining)
    });
  }
  
  // log a chaque fois que remaining=0
  if (remaining === 0) {
    console.warn('[computeRemainingTime] remaining=0', {
      turnStartedAt,
      turnDurationMs,
      currentTime,
      serverTimeOffset,
      serverNow,
      turnEndsAt,
      calculatedRemaining,
      remaining
    });
  }
  
  return remaining;
}

export function isTimerExpired(
  gameMode: 'local' | 'multiplayer',
  phase: string,
  remainingMs: number,
  wordJustSubmitted: boolean,
  turnInProgress: boolean,
  timerGracePeriod: boolean,
  turnStartTime: number,
  turnStartedAt?: number
): boolean {
  if (gameMode !== 'local' || phase !== 'TURN_ACTIVE') {
    return false;
  }

  const validTurnStart = turnStartTime || turnStartedAt;
  if (!validTurnStart) return false;

  const timeSinceTurnStart = Date.now() - validTurnStart;
  
  return (
    remainingMs <= 0 &&
    !wordJustSubmitted &&
    !turnInProgress &&
    !timerGracePeriod &&
    timeSinceTurnStart >= 200
  );
}

