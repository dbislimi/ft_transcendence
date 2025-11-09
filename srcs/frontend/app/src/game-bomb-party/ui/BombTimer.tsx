import React from 'react';

interface BombTimerProps {
  syllable: string;
  remainingMs: number;
  isActive: boolean;
  usageCount?: number;
  totalPlayers?: number;
  currentPlayerName?: string;
  flashExtend?: boolean; // visual flash when time extended
}

export default function BombTimer({ 
  syllable, 
  remainingMs, 
  isActive, 
  usageCount, 
  totalPlayers,
  currentPlayerName,
  flashExtend = false,
}: BombTimerProps) {
  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isDanger = false;
  const timeDisplay = formatTime(remainingMs);
  
  // Protection contre syllable undefined
  const displaySyllable = syllable || '...';

  if (!isActive || remainingMs <= 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {/* Bombe statique */}
        <div className="text-8xl mb-6">
          💣
        </div>
        
        {/* Syllabe */}
        <div className="text-5xl font-bold tracking-wider text-slate-400">
          {displaySyllable.toUpperCase()}
        </div>
        
        {/* Compteur d'utilisation de la syllabe */}
        {usageCount !== undefined && totalPlayers !== undefined && (
          <div className="text-lg text-slate-300 mt-2 bg-slate-800/50 px-3 py-1 rounded-full">
            {usageCount} / {totalPlayers}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      {/* Bombe animée avec effet de pulsation */}
      <div className="relative mb-6">
        <div className="text-8xl animate-pulse">
          💣
        </div>
        {/* Effet de lueur autour de la bombe */}
        <div className={`absolute inset-0 text-8xl blur-sm opacity-50 ${
          isDanger ? 'text-red-500 animate-ping' : 'text-yellow-500'
        }`}>
          💣
        </div>
      </div>
      
      {/* Timer simplifié sans état de danger */}
      <div className={`text-6xl font-bold mb-4 transition-all duration-200 ${flashExtend ? 'text-green-400 animate-pulse' : 'text-cyan-400'}`}>
        {timeDisplay}
      </div>
      
      {/* Syllabe */}
      <div className={`text-5xl font-bold tracking-wider transition-all duration-300 ${
        isActive ? 'text-yellow-400' : 'text-slate-400'
      }`}>
        {syllable.toUpperCase()}
      </div>
      
      {/* Indicateur de tour actuel */}
      {currentPlayerName && (
        <div className="text-xl text-yellow-300 mt-4 bg-yellow-500/20 px-4 py-2 rounded-full border border-yellow-500/30">
          ⏳ {currentPlayerName}
        </div>
      )}
      
      {/* Compteur d'utilisation de la syllabe */}
      {usageCount !== undefined && totalPlayers !== undefined && (
        <div className="text-lg text-slate-300 mt-2 bg-slate-800/50 px-3 py-1 rounded-full">
          {usageCount} / {totalPlayers}
        </div>
      )}
      
      {/* Indicateur de danger supprimé */}
    </div>
  );
}