import React from 'react';
import { useBackground, type BackgroundKey } from '../contexts/BackgroundContext';

interface BackgroundSurfaceProps {
  game?: 'bombparty' | 'pong';
  className?: string;
  children: React.ReactNode;
}

export default function BackgroundSurface({ game, className = '', children }: BackgroundSurfaceProps) {
  const { getBackgroundFor, getBackgroundUrl, getGlobalBackgroundKey } = useBackground();
  const effectiveKey: BackgroundKey = game ? getBackgroundFor(game) : getGlobalBackgroundKey();
  const url = getBackgroundUrl(effectiveKey);

  // If default, render nothing intrusive; preserve existing native backgrounds
  if (!url) return <>{children}</>;

  return (
    <div
      className={`relative min-h-screen ${className}`}
      style={{
        backgroundImage: `url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="backdrop-blur-0">
        {children}
      </div>
    </div>
  );
}


