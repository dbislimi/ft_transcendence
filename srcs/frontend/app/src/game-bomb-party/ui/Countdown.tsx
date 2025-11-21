import React from 'react';
import { useTranslation } from 'react-i18next';

interface CountdownProps {
  count: number;
  isActive: boolean;
}

export default function Countdown({ count, isActive }: CountdownProps) {
  const { t } = useTranslation();
  if (!isActive || count <= 0) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
      <div className="text-center">
        <div className="text-2xl text-slate-300 mb-4">
          {t('bombParty.game.countdown')}
        </div>
        <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 animate-countdown-pulse">
          {count}
        </div>
      </div>
    </div>
  );
}