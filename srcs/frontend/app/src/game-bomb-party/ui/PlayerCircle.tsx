import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Player } from '../core/types';
import { usePlayerProfile } from '../../hook/usePlayerProfile';
import PlayerInfoTooltip from '../../Components/PlayerInfoTooltip';
import { useTranslation } from 'react-i18next';

interface PlayerCircleProps {
  players: Player[];
  currentPlayerIndex: number;
  radiusBoost?: number; // <— ajouter ceci
  pendingFastForNextPlayerId?: string;
  onPlayerClick?: (playerId: string) => void;
}

export default function PlayerCircle({ players, currentPlayerIndex, radiusBoost = 0, pendingFastForNextPlayerId, onPlayerClick }: PlayerCircleProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const activeId = clickedId ?? hoveredId;
  const { profile } = usePlayerProfile(activeId);

  const { radius, positions } = useMemo(() => {
    const count = Math.max(2, Math.min(players.length, 12));
    const vw = Math.max(800, containerSize.w || window.innerWidth);
    const vh = Math.max(600, containerSize.h || window.innerHeight);
    const minDim = Math.min(vw, vh);

    // Base responsive radius driven by viewport size
    let r = Math.max(160, Math.min(minDim * 0.35, 420));

    // Grow with sqrt(n) for better spacing as count increases
    r += Math.sqrt(count) * 10;

    // Apply external boost from parent
    r += radiusBoost;

    // Enforce minimum angular spacing translating to minimum arc length
    const minArcPx = 140; // minimum distance between cards
    const angleStep = (2 * Math.PI) / count;
    const arcLength = (x: number) => x * r;
    if (arcLength(angleStep) < minArcPx) {
      // increase r until arc length meets the minimum, cap at safe max
      const requiredR = minArcPx / angleStep;
      r = Math.min(Math.max(r, requiredR), 600);
    }

    const pos = players.map((_, index) => {
      const angle = index * angleStep - Math.PI / 2; // start top
      return {
        left: `calc(50% + ${Math.cos(angle) * r}px)`,
        top: `calc(50% + ${Math.sin(angle) * r}px)`,
      };
    });
    return { radius: r, positions: pos };
  }, [players.length, radiusBoost, containerSize.w, containerSize.h]);

  useEffect(() => {
    const update = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setContainerSize({ w: rect.width, h: rect.height });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handlePointerOver = (playerId: string, evt: React.MouseEvent) => {
    setHoveredId(playerId);
    updateTooltipPosition(evt);
  };
  const handlePointerMove = (evt: React.MouseEvent) => {
    if (!hoveredId) return;
    updateTooltipPosition(evt);
  };
  const handlePointerOut = () => setHoveredId(null);
  const handleClick = (playerId: string, evt: React.MouseEvent) => {
    onPlayerClick?.(playerId);
    setClickedId(playerId);
    updateTooltipPosition(evt);
  };
  const updateTooltipPosition = (evt: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: evt.clientX - rect.left, y: evt.clientY - rect.top - 8 });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center select-none">
      <div className="absolute w-1.5 h-1.5 bg-purple-400 rounded-full opacity-20" />
      {players.map((player, index) => {
        const isCurrent = index === currentPlayerIndex;
        const isEliminated = player.isEliminated;
        return (
          <div
            key={player.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${isEliminated ? 'opacity-50' : 'opacity-100'}`}
            style={positions[index]}
            onMouseOver={(e) => handlePointerOver(player.id, e)}
            onMouseMove={handlePointerMove}
            onMouseOut={handlePointerOut}
            onClick={(e) => handleClick(player.id, e)}
          >
            {isCurrent && !isEliminated && (
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-400/30 to-purple-400/30 animate-pulse" />
            )}
            <div className={`relative bg-slate-800/90 backdrop-blur-md rounded-xl border p-3 min-w-[110px] text-center transition-all duration-300 ${
              isCurrent && !isEliminated ? 'border-cyan-400 shadow-lg shadow-cyan-400/25 scale-110' : 'border-slate-600'
            } ${isEliminated ? 'border-red-500/50' : ''}`}>
              <div className={`font-semibold mb-2 ${isCurrent && !isEliminated ? 'text-cyan-300' : 'text-slate-200'} ${isEliminated ? 'text-red-400' : ''}`}>
                {player.name}
              </div>
              <div className="flex justify-center items-center gap-1 mb-2">
                {Array.from({ length: player.lives }, (_, i) => (
                  <span key={i} className="text-lg text-red-400">❤️</span>
                ))}
              </div>
              {/* Pending effect badges */}
              <div className="flex items-center justify-center gap-1 mb-1 text-sm">
                {pendingFastForNextPlayerId === player.id && !isEliminated && (
                  <span title={t('bombParty.hud.fastTurn')} className="text-yellow-300">⚡</span>
                )}
                {player.pendingEffects?.doubleChance && !isEliminated && (
                  <span title="Double chance" className="text-cyan-300">♢</span>
                )}
              </div>
              <div className="text-xs px-2 py-1 rounded-full bg-slate-600/50 text-slate-400">
                {isEliminated ? t('bombParty.hud.eliminated') : isCurrent ? t('bombParty.hud.yourTurn') : t('bombParty.hud.waiting')}
              </div>
            </div>
          </div>
        );
      })}
      <PlayerInfoTooltip profile={profile} visible={Boolean(activeId)} x={tooltipPos.x} y={tooltipPos.y} onClose={() => setClickedId(null)} />
    </div>
  );
}