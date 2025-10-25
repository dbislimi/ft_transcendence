import React, { memo } from 'react';
import { useBombPartyStore } from '../../store/useBombPartyStore';

interface OptimizedPlayerCircleProps {
  playerId: string;
  className?: string;
  onClick?: () => void;
}

const OptimizedPlayerCircle: React.FC<OptimizedPlayerCircleProps> = memo(({ 
  playerId, 
  className = '', 
  onClick 
}) => {
  const player = useBombPartyStore(state => 
    state.gameState?.players.find(p => p.id === playerId)
  );
  const currentPlayerId = useBombPartyStore(state => state.gameState?.currentPlayerId);
  const isMyTurn = useBombPartyStore(state => state.isMyTurn);
  const setProfilePlayerId = useBombPartyStore(state => state.setProfilePlayerId);

  if (!player) {
    return null;
  }

  const isCurrentPlayer = currentPlayerId === playerId;
  const isMyPlayer = isMyTurn() && isCurrentPlayer;
  const isEliminated = player.isEliminated;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setProfilePlayerId(playerId);
    }
  };

  const getPlayerStatus = (): string => {
    if (isEliminated) return 'Eliminated';
    if (isCurrentPlayer) return 'Current';
    return 'Waiting';
  };

  const getStatusColor = (): string => {
    if (isEliminated) return 'bg-gray-500';
    if (isCurrentPlayer) return 'bg-blue-500';
    return 'bg-gray-300';
  };

  return (
    <div 
      className={`
        relative w-16 h-16 rounded-full border-4 cursor-pointer
        transition-all duration-300 hover:scale-105
        ${isMyPlayer ? 'border-yellow-400 shadow-lg' : 'border-gray-300'}
        ${isEliminated ? 'opacity-50' : ''}
        ${className}
      `}
      onClick={handleClick}
    >
      <div className={`
        w-full h-full rounded-full flex items-center justify-center
        ${getStatusColor()}
      `}>
        <span className="text-white font-bold text-sm">
          {player.name.charAt(0).toUpperCase()}
        </span>
      </div>
      
      <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
        {player.lives}
      </div>
      
      {player.streak > 0 && (
        <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {player.streak}
        </div>
      )}
      
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-center whitespace-nowrap">
        <div className="font-semibold">{player.name}</div>
        <div className="text-gray-500">{getPlayerStatus()}</div>
      </div>
    </div>
  );
});

OptimizedPlayerCircle.displayName = 'OptimizedPlayerCircle';

export default OptimizedPlayerCircle;
