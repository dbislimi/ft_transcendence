import React from 'react';
import { useGlobalBackground } from '../contexts/GlobalBackgroundContext';

interface BackgroundSurfaceProps {
  game?: 'bombparty' | 'pong';
  className?: string;
  children: React.ReactNode;
}

export default function BackgroundSurface({ game, className = '', children }: BackgroundSurfaceProps) {
  const { currentBackground } = useGlobalBackground();
  if (currentBackground.id === 'default') {
    return <>{children}</>;
  }
  return (
    <div
      className={`relative min-h-screen ${className}`}
      style={{
        backgroundImage: currentBackground.url ? `url(${currentBackground.url})` : 'none',
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
