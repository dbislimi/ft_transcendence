import React from 'react';
import type { Player } from '../core/types';

interface PlayerCircleProps {
  players: Player[];
  currentPlayerIndex: number;
}

export default function PlayerCircle({ players, currentPlayerIndex }: PlayerCircleProps) {
  const getPlayerPosition = (index: number, totalPlayers: number) => {
    let angle: number;
    let radius: number;
    
    if (totalPlayers === 2) {
      // 2 joueurs : opposés (0° et 180°)
      angle = index * 180;
      radius = 200;
    } else if (totalPlayers === 3) {
      // 3 joueurs : triangle (0°, 120°, 240°)
      angle = index * 120;
      radius = 200;
    } else if (totalPlayers === 4) {
      // 4 joueurs : carré (0°, 90°, 180°, 270°)
      angle = index * 90;
      radius = 180;
    } else if (totalPlayers === 5) {
      // 5 joueurs : pentagone (0°, 72°, 144°, 216°, 288°)
      angle = index * 72;
      radius = 170;
    } else if (totalPlayers === 6) {
      // 6 joueurs : hexagone (0°, 60°, 120°, 180°, 240°, 300°)
      angle = index * 60;
      radius = 160;
    } else if (totalPlayers === 7) {
      // 7 joueurs : heptagone (0°, 51.43°, 102.86°, 154.29°, 205.71°, 257.14°, 308.57°)
      angle = index * (360 / 7);
      radius = 150;
    } else {
      // 8+ joueurs : cercle parfait
      angle = index * (360 / totalPlayers);
      radius = 140;
    }
    
    return {
      left: `calc(50% + ${Math.cos((angle * Math.PI) / 180) * radius}px)`,
      top: `calc(50% + ${Math.sin((angle * Math.PI) / 180) * radius}px)`
    };
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Cercle central (pour référence visuelle) */}
      <div className="absolute w-4 h-4 bg-purple-400 rounded-full opacity-30"></div>
      
      {/* Joueurs */}
      {players.map((player, index) => {
        const position = getPlayerPosition(index, players.length);
        const isCurrentPlayer = index === currentPlayerIndex;
        const isEliminated = player.isEliminated;
        
        return (
          <div
            key={player.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
              isEliminated ? 'opacity-50' : 'opacity-100'
            }`}
            style={position}
          >
            {/* Halo pour le joueur actif */}
            {isCurrentPlayer && !isEliminated && (
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400/30 to-purple-400/30 rounded-full animate-pulse"></div>
            )}
            
            {/* Carte du joueur */}
            <div className={`relative bg-slate-800/90 backdrop-blur-md rounded-xl border p-4 min-w-[120px] text-center transition-all duration-300 ${
              isCurrentPlayer && !isEliminated
                ? 'border-cyan-400 shadow-lg shadow-cyan-400/25 scale-110'
                : 'border-slate-600'
            } ${isEliminated ? 'border-red-500/50' : ''}`}>
              
              {/* Nom du joueur */}
              <div className={`font-semibold mb-2 ${
                isCurrentPlayer && !isEliminated ? 'text-cyan-300' : 'text-slate-200'
              } ${isEliminated ? 'text-red-400' : ''}`}>
                {player.name}
              </div>
              
              {/* Vies */}
              <div className="flex justify-center items-center gap-1 mb-2">
                {Array.from({ length: player.lives }, (_, i) => (
                  <span
                    key={i}
                    className={`text-lg ${
                      i < player.lives ? 'text-red-400' : 'text-slate-600'
                    }`}
                  >
                    ❤️
                  </span>
                ))}
              </div>
              
              {/* Statut */}
              <div className={`text-xs px-2 py-1 rounded-full ${
                isCurrentPlayer && !isEliminated
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : isEliminated
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-slate-600/50 text-slate-400'
              }`}>
                {isCurrentPlayer && !isEliminated ? 'À toi !' : isEliminated ? 'Éliminé' : 'En attente'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
