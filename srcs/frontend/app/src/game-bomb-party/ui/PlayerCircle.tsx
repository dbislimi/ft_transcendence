import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Player } from '../core/types';
import { usePlayerProfile } from '../../hook/usePlayerProfile';
import PlayerInfoTooltip from '../../Components/PlayerInfoTooltip';
import { useTranslation } from 'react-i18next';
import { useBombPartyStore } from '../../store/useBombPartyStore';
import { ShakeAnimation, RedParticles } from './Animations';
import { useSoundEffects } from './useSoundEffects';
import { useSettings } from '../../contexts/SettingsContext';

interface PlayerCircleProps {
  players: Player[];
  currentPlayerIndex: number;
  radiusBoost?: number;
  pendingFastForNextPlayerId?: string;
  onPlayerClick?: (playerId: string) => void;
}

const PlayerLives = React.memo(({ player, playerId }: { player: Player; playerId: string }) => {
  const optimisticLoss = useBombPartyStore((state) => state.optimisticLifeLoss);
  const isLosingLife = optimisticLoss?.playerId === playerId && optimisticLoss.timestamp > Date.now() - 2000;
  
  const displayLives = isLosingLife ? Math.max(0, player.lives - 1) : player.lives;
  
  return (
    <div className="flex justify-center items-center gap-1 mb-2">
      {Array.from({ length: displayLives }, (_, i) => (
        <img 
          key={`life-${playerId}-${i}-${displayLives}`} 
          src="/img/bombparty/life.png"
          alt="❤️"
          className="w-5 h-5 object-contain"
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.player.id === nextProps.player.id &&
    prevProps.player.lives === nextProps.player.lives &&
    prevProps.player.isEliminated === nextProps.player.isEliminated &&
    prevProps.playerId === nextProps.playerId
  );
});

PlayerLives.displayName = 'PlayerLives';

export default React.memo(function PlayerCircle({ players, currentPlayerIndex, radiusBoost = 0, pendingFastForNextPlayerId, onPlayerClick }: PlayerCircleProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const { playSound } = useSoundEffects();
  const { settings } = useSettings();
  const previousLivesRef = useRef<Map<string, number>>(new Map());
  const [lifeLossTriggers, setLifeLossTriggers] = useState<Map<string, number>>(new Map());
  const activeId = clickedId ?? hoveredId;
  const { profile } = usePlayerProfile(activeId);
  const { radius, positions } = useMemo(() => {
    const count = Math.max(2, Math.min(players.length, 12));
    const vw = Math.max(800, containerSize.w || window.innerWidth);
    const vh = Math.max(600, containerSize.h || window.innerHeight);
    const minDim = Math.min(vw, vh);
    let r = Math.max(160, Math.min(minDim * 0.35, 420));
    r += Math.sqrt(count) * 10;
    r += radiusBoost;
    const minArcPx = 140;
    const angleStep = (2 * Math.PI) / count;
    const arcLength = (x: number) => x * r;
    if (arcLength(angleStep) < minArcPx) {
      const requiredR = minArcPx / angleStep;
      r = Math.min(Math.max(r, requiredR), 600);
    }
    const pos = players.map((_, index) => {
      const angle = index * angleStep - Math.PI / 2;
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
  useEffect(() => {
    const newTriggers = new Map<string, number>();
    players.forEach((player) => {
      const previousLives = previousLivesRef.current.get(player.id) ?? player.lives;
      if (previousLives > player.lives && player.lives >= 0) {
        newTriggers.set(player.id, Date.now());
        playSound('lifeLoss');
      }
      previousLivesRef.current.set(player.id, player.lives);
    });
    if (newTriggers.size > 0) {
      setLifeLossTriggers(newTriggers);
    }
  }, [players, playSound]);
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
        const lifeLossTrigger = lifeLossTriggers.get(player.id);
        const animationsDisabled = settings.game?.preferences?.reducedMotion || !settings.display.animations;
        return (
          <div
            key={player.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${isEliminated ? 'opacity-50' : 'opacity-100'}`}
            style={positions[index]}
            onMouseOver={(e) => handlePointerOver(player.id, e)}
            onMouseMove={handlePointerMove}
            onMouseOut={handlePointerOut}
            onClick={(e) => handleClick(player.id, e)}
          >
            <ShakeAnimation trigger={lifeLossTrigger} disabled={animationsDisabled}>
              <div className="relative">
                {isCurrent && !isEliminated && (
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-400/30 to-purple-400/30 animate-current-player-glow" />
                )}
                <div className={`relative bg-slate-800/90 backdrop-blur-md rounded-xl border p-3 min-w-[110px] text-center transition-colors duration-300 ease-out ${
                  isCurrent && !isEliminated ? 'border-cyan-400 shadow-lg shadow-cyan-400/25 scale-110' : 'border-slate-600'
                } ${isEliminated ? 'border-red-500/50' : ''}`}>
                  <RedParticles trigger={lifeLossTrigger} disabled={animationsDisabled} />
                  <div className={`font-semibold mb-2 transition-colors duration-300 ${isCurrent && !isEliminated ? 'text-cyan-300' : 'text-slate-200'} ${isEliminated ? 'text-red-400' : ''}`}>
                    {player.name}
                  </div>
                  <PlayerLives player={player} playerId={player.id} />
                  <div className="flex items-center justify-center gap-1 mb-1 text-sm">
                    {pendingFastForNextPlayerId === player.id && !isEliminated && (
                      <span title={t('bombParty.hud.fastTurn')} className="text-yellow-300">⚡</span>
                    )}
                    {player.pendingEffects?.doubleChance && !isEliminated && (
                      <span title={t('bombParty.bonus.doubleChance.name')} className="text-cyan-300">♢</span>
                    )}
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-slate-600/50 text-slate-400">
                    {isEliminated ? t('bombParty.hud.eliminated') : isCurrent ? t('bombParty.hud.yourTurn') : t('bombParty.hud.waiting')}
                  </div>
                </div>
              </div>
            </ShakeAnimation>
          </div>
        );
      })}
      <PlayerInfoTooltip profile={profile} visible={Boolean(activeId)} x={tooltipPos.x} y={tooltipPos.y} onClose={() => setClickedId(null)} />
    </div>
  );
}, (prevProps, nextProps) => {
  const playersEqual = prevProps.players.length === nextProps.players.length &&
    prevProps.players.every((p, i) => {
      const nextP = nextProps.players[i];
      return p.id === nextP.id && 
             p.lives === nextP.lives && 
             p.isEliminated === nextP.isEliminated &&
             p.name === nextP.name;
    });
  
  const propsEqual = 
    prevProps.currentPlayerIndex === nextProps.currentPlayerIndex &&
    prevProps.radiusBoost === nextProps.radiusBoost &&
    prevProps.pendingFastForNextPlayerId === nextProps.pendingFastForNextPlayerId &&
    playersEqual;
  
  return propsEqual;
});
