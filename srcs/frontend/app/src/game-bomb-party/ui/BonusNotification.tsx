import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BonusKey } from '../core/types';

interface BonusNotificationProps {
  bonusKey: BonusKey;
  playerName: string;
  onClose: () => void;
}

const bonusIcons: Record<BonusKey, string> = {
  inversion: '🔁',
  plus5sec: '➕',
  vitesseEclair: '⚡',
  doubleChance: '♢',
  extraLife: '❤️',
};

const bonusColors: Record<BonusKey, { from: string; to: string; glow: string }> = {
  inversion: { from: 'from-purple-600', to: 'to-indigo-600', glow: 'shadow-purple-500/50' },
  plus5sec: { from: 'from-green-600', to: 'to-emerald-600', glow: 'shadow-green-500/50' },
  vitesseEclair: { from: 'from-yellow-600', to: 'to-orange-600', glow: 'shadow-yellow-500/50' },
  doubleChance: { from: 'from-blue-600', to: 'to-cyan-600', glow: 'shadow-blue-500/50' },
  extraLife: { from: 'from-pink-600', to: 'to-rose-600', glow: 'shadow-pink-500/50' },
};

const bonusNames: Record<BonusKey, string> = {
  inversion: 'bombParty.bonus.inversion.name',
  plus5sec: 'bombParty.bonus.plus5sec.name',
  vitesseEclair: 'bombParty.bonus.vitesseEclair.name',
  doubleChance: 'bombParty.bonus.doubleChance.name',
  extraLife: 'bombParty.bonus.extraLife.name',
};

export default function BonusNotification({ bonusKey, playerName, onClose }: BonusNotificationProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const colors = bonusColors[bonusKey];

  useEffect(() => {
    setIsVisible(true);
    setIsAnimating(true);
    
    const animationTimer = setTimeout(() => {
      setIsAnimating(false);
    }, 600);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(animationTimer);
    };
  }, [onClose]);

  return (
    <div
      className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-95'
      }`}
    >
      <div className={`absolute inset-0 blur-2xl ${colors.glow} opacity-75 animate-double-chance-glow`}></div>
      
      <div className={`relative bg-gradient-to-r ${colors.from}/95 ${colors.to}/95 backdrop-blur-xl border-2 border-white/30 rounded-2xl px-8 py-5 shadow-2xl flex items-center gap-5 min-w-[350px] transform transition-transform duration-500 ${
        isAnimating ? 'animate-bonus-flash' : ''
      }`}>
        <div className="relative">
          <div className={`text-5xl transform transition-transform duration-500 ${
            isAnimating ? 'animate-spin-slow scale-110' : 'scale-100'
          }`}>
            {bonusIcons[bonusKey]}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-16 h-16 rounded-full border-2 border-white/30 animate-modern-ping ${colors.glow}`}></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-12 h-12 rounded-full border-2 border-white/20 animate-modern-ping ${colors.glow}`} style={{ animationDelay: '150ms' }}></div>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="text-white font-bold text-xl mb-1 transform transition-transform duration-300 hover:scale-105">
            {t(bonusNames[bonusKey])}
          </div>
          <div className="text-white/90 text-sm font-medium">
            {t('bombParty.bonus.activatedBy', { player: playerName })}
          </div>
        </div>
        
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 500);
          }}
          className="text-white/70 hover:text-white transition-colors duration-200 hover:scale-125 hover:rotate-90 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20"
          aria-label={t('common.close', 'Fermer')}
        >
          ✕
        </button>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-2xl overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${colors.from} ${colors.to} animate-progress`}
            style={{ animation: 'progress 3s linear forwards' }}
          ></div>
        </div>
      </div>
      
      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-progress {
          animation: progress 3s linear forwards;
        }
      `}</style>
    </div>
  );
}

