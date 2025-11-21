import React, { memo, useState, useEffect } from 'react';
import { useBombPartyStore } from '../../store/useBombPartyStore';
import { useRafTick } from '../../hooks/useRafTick';

interface OptimizedTimerProps {
  className?: string;
}

const OptimizedTimer: React.FC<OptimizedTimerProps> = memo(({ className }) => {
  const [displayTime, setDisplayTime] = useState(0);
  const getRemainingTime = useBombPartyStore(state => state.getRemainingTime);
  const gameState = useBombPartyStore(state => state.gameState);
  const isMyTurn = useBombPartyStore(state => state.isMyTurn);
  const setTimerFlash = useBombPartyStore(state => state.setTimerFlash);
  const setTimerGracePeriod = useBombPartyStore(state => state.setTimerGracePeriod);

  const isActive = gameState?.phase === 'TURN_ACTIVE';
  const remainingTime = getRemainingTime();
  const isMyTurnActive = isMyTurn();

  useRafTick(isActive, () => {
    const time = getRemainingTime();
    setDisplayTime(time);
    
    if (time <= 3000 && time > 0) {
      setTimerFlash(true);
    } else {
      setTimerFlash(false);
    }
    
    if (time <= 0 && isMyTurnActive) {
      setTimerGracePeriod(true);
    } else {
      setTimerGracePeriod(false);
    }
  });

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    return seconds.toString().padStart(2, '0');
  };

  const getTimerColor = (): string => {
    if (displayTime <= 3000) return 'text-red-500';
    if (displayTime <= 5000) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className={`text-center ${className}`}>
      <div className={`text-4xl font-bold ${getTimerColor()}`}>
        {formatTime(displayTime)}
      </div>
      <div className="text-sm text-gray-500 mt-1">
        {isMyTurnActive ? 'Your turn' : 'Waiting...'}
      </div>
    </div>
  );
});

OptimizedTimer.displayName = 'OptimizedTimer';

export default OptimizedTimer;
