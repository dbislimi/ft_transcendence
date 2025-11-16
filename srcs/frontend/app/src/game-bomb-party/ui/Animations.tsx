import React, { useEffect, useState } from 'react';

export function ShakeAnimation({ 
  children, 
  trigger, 
  disabled = false 
}: { 
  children: React.ReactNode; 
  trigger: any; 
  disabled?: boolean;
}) {
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (trigger && !disabled) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 600);
      return () => clearTimeout(timer);
    }
  }, [trigger, disabled]);

  return (
    <div className={isShaking ? 'animate-shake' : ''}>
      {children}
    </div>
  );
}

export function RedParticles({ 
  trigger, 
  disabled = false 
}: { 
  trigger: any; 
  disabled?: boolean;
}) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    if (trigger && !disabled) {
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
      }));
      setParticles(newParticles);
      const timer = setTimeout(() => setParticles([]), 1000);
      return () => clearTimeout(timer);
    }
  }, [trigger, disabled]);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 bg-red-500 rounded-full animate-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.id * 50}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function SuccessAnimation({ 
  trigger, 
  disabled = false 
}: { 
  trigger: any; 
  disabled?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trigger && !disabled) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [trigger, disabled]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="animate-success-checkmark">
        <svg
          className="w-24 h-24 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
            className="animate-draw-checkmark"
          />
        </svg>
        <div className="absolute inset-0 bg-green-500/20 rounded-full animate-success-pulse" />
      </div>
    </div>
  );
}

export function ErrorAnimation({ 
  trigger, 
  disabled = false,
  message 
}: { 
  trigger: any; 
  disabled?: boolean;
  message?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trigger && !disabled) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [trigger, disabled]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="animate-error-x">
        <div className="relative">
          <svg
            className="w-24 h-24 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M6 18L18 6M6 6l12 12"
              className="animate-draw-x"
            />
          </svg>
          <div className="absolute inset-0 bg-red-500/20 rounded-full animate-error-pulse" />
        </div>
        {message && (
          <div className="mt-4 px-6 py-3 bg-red-500/90 backdrop-blur-md rounded-lg border border-red-400 animate-error-message">
            <p className="text-white font-semibold text-center">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BonusFlashAnimation({ 
  trigger, 
  disabled = false,
  bonusIcon,
  bonusName 
}: { 
  trigger: any; 
  disabled?: boolean;
  bonusIcon?: string;
  bonusName?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trigger && !disabled) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [trigger, disabled]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="animate-bonus-flash">
        <div className="relative">
          <div className="text-6xl mb-4 animate-bonus-icon-bounce">
            {bonusIcon || '✨'}
          </div>
          {bonusName && (
            <div className="text-2xl font-bold text-cyan-400 animate-bonus-text">
              {bonusName}
            </div>
          )}
          <div className="absolute inset-0 bg-cyan-500/30 rounded-full animate-bonus-pulse blur-xl" />
        </div>
      </div>
    </div>
  );
}

export function TurnTransitionAnimation({ 
  trigger, 
  disabled = false,
  playerName 
}: { 
  trigger: any; 
  disabled?: boolean;
  playerName?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trigger && !disabled) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [trigger, disabled]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
      <div className="animate-turn-transition">
        <div className="px-8 py-4 bg-slate-800/90 backdrop-blur-md rounded-xl border border-cyan-400/50 shadow-lg shadow-cyan-400/25">
          <p className="text-cyan-300 text-xl font-semibold text-center">
            {playerName ? `Tour de ${playerName}` : 'Nouveau tour'}
          </p>
        </div>
      </div>
    </div>
  );
}

export const AnimationStyles = () => (
  <style>{`
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
      20%, 40%, 60%, 80% { transform: translateX(8px); }
    }
    .animate-shake {
      animation: shake 0.6s ease-in-out;
    }

    @keyframes particle {
      0% {
        opacity: 1;
        transform: translate(0, 0) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(
          ${Math.random() * 200 - 100}px,
          ${Math.random() * 200 - 100}px
        ) scale(0);
      }
    }
    .animate-particle {
      animation: particle 1s ease-out forwards;
    }

    @keyframes success-checkmark {
      0% {
        transform: scale(0);
        opacity: 0;
      }
      50% {
        transform: scale(1.2);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    .animate-success-checkmark {
      animation: success-checkmark 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    @keyframes draw-checkmark {
      0% {
        stroke-dasharray: 0 50;
        stroke-dashoffset: 0;
      }
      100% {
        stroke-dasharray: 50 0;
        stroke-dashoffset: 0;
      }
    }
    .animate-draw-checkmark {
      animation: draw-checkmark 0.5s ease-out forwards;
    }

    @keyframes success-pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.3;
      }
      50% {
        transform: scale(1.5);
        opacity: 0.1;
      }
    }
    .animate-success-pulse {
      animation: success-pulse 1.5s ease-in-out infinite;
    }

    @keyframes error-x {
      0% {
        transform: scale(0) rotate(0deg);
        opacity: 0;
      }
      50% {
        transform: scale(1.2) rotate(180deg);
      }
      100% {
        transform: scale(1) rotate(360deg);
        opacity: 1;
      }
    }
    .animate-error-x {
      animation: error-x 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    @keyframes draw-x {
      0% {
        stroke-dasharray: 0 50;
        stroke-dashoffset: 0;
      }
      100% {
        stroke-dasharray: 50 0;
        stroke-dashoffset: 0;
      }
    }
    .animate-draw-x {
      animation: draw-x 0.5s ease-out forwards;
    }

    @keyframes error-pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.3;
      }
      50% {
        transform: scale(1.5);
        opacity: 0.1;
      }
    }
    .animate-error-pulse {
      animation: error-pulse 2s ease-in-out infinite;
    }

    @keyframes error-message {
      0% {
        opacity: 0;
        transform: translateY(-10px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-error-message {
      animation: error-message 0.3s ease-out;
    }

    @keyframes bonus-flash {
      0% {
        transform: scale(0);
        opacity: 0;
      }
      50% {
        transform: scale(1.3);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 0.9;
      }
    }
    .animate-bonus-flash {
      animation: bonus-flash 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    @keyframes bonus-icon-bounce {
      0%, 100% {
        transform: translateY(0) scale(1);
      }
      25% {
        transform: translateY(-20px) scale(1.1);
      }
      50% {
        transform: translateY(0) scale(1);
      }
      75% {
        transform: translateY(-10px) scale(1.05);
      }
    }
    .animate-bonus-icon-bounce {
      animation: bonus-icon-bounce 1.5s ease-in-out;
    }

    @keyframes bonus-text {
      0% {
        opacity: 0;
        transform: translateY(10px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-bonus-text {
      animation: bonus-text 0.5s ease-out 0.3s both;
    }

    @keyframes bonus-pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.3;
      }
      50% {
        transform: scale(2);
        opacity: 0.1;
      }
    }
    .animate-bonus-pulse {
      animation: bonus-pulse 1.5s ease-in-out infinite;
    }

    @keyframes turn-transition {
      0% {
        opacity: 0;
        transform: translateY(-20px) scale(0.9);
      }
      50% {
        opacity: 1;
        transform: translateY(0) scale(1.05);
      }
      100% {
        opacity: 0;
        transform: translateY(20px) scale(0.9);
      }
    }
    .animate-turn-transition {
      animation: turn-transition 0.8s ease-in-out;
    }

    /* Animations pour les boutons de bonus */
    @keyframes spin-bonus {
      0% { transform: rotate(0deg) scale(1); }
      50% { transform: rotate(180deg) scale(1.2); }
      100% { transform: rotate(360deg) scale(1); }
    }
    .animate-spin-bonus {
      animation: spin-bonus 0.6s ease-in-out;
    }

    @keyframes bonus-activate {
      0%, 100% { transform: scale(1); }
      25% { transform: scale(1.3) rotate(5deg); }
      50% { transform: scale(1.2) rotate(-5deg); }
      75% { transform: scale(1.25) rotate(3deg); }
    }
    .animate-bonus-activate {
      animation: bonus-activate 0.6s ease-out;
    }

    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .animate-spin-slow {
      animation: spin-slow 3s linear infinite;
    }

    @keyframes double-chance-glow {
      0%, 100% {
        opacity: 1;
        filter: brightness(1) drop-shadow(0 0 5px rgba(59, 130, 246, 0.5));
        transform: scale(1);
      }
      50% {
        opacity: 1;
        filter: brightness(1.4) drop-shadow(0 0 15px rgba(59, 130, 246, 1));
        transform: scale(1.02);
      }
    }
    .animate-double-chance-glow {
      animation: double-chance-glow 1.5s ease-in-out infinite;
    }

    @keyframes modern-ping {
      0% {
        transform: scale(1);
        opacity: 0.8;
        filter: blur(0px);
      }
      50% {
        transform: scale(1.5);
        opacity: 0.4;
        filter: blur(2px);
      }
      100% {
        transform: scale(2.5);
        opacity: 0;
        filter: blur(4px);
      }
    }
    .animate-modern-ping {
      animation: modern-ping 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    @keyframes current-player-glow {
      0%, 100% {
        opacity: 0.3;
        transform: scale(1);
        filter: brightness(1);
      }
      50% {
        opacity: 0.6;
        transform: scale(1.02);
        filter: brightness(1.3);
      }
    }
    .animate-current-player-glow {
      animation: current-player-glow 2s ease-in-out infinite;
    }

    @keyframes timer-flash {
      0%, 100% {
        opacity: 1;
        filter: brightness(1) drop-shadow(0 0 10px rgba(34, 197, 94, 0.5));
        transform: scale(1);
      }
      50% {
        opacity: 1;
        filter: brightness(1.5) drop-shadow(0 0 25px rgba(34, 197, 94, 1));
        transform: scale(1.05);
      }
    }
    .animate-timer-flash {
      animation: timer-flash 0.8s ease-in-out infinite;
    }

    @keyframes bomb-pulse {
      0%, 100% {
        transform: scale(1) rotate(0deg);
      }
      25% {
        transform: scale(1.08) rotate(-2deg);
      }
      50% {
        transform: scale(1.12) rotate(0deg);
      }
      75% {
        transform: scale(1.08) rotate(2deg);
      }
    }
    .animate-bomb-pulse {
      animation: bomb-pulse 1.5s ease-in-out infinite;
    }

    @keyframes countdown-pulse {
      0%, 100% {
        opacity: 1;
        filter: brightness(1) drop-shadow(0 0 20px rgba(139, 92, 246, 0.6));
        transform: scale(1);
      }
      50% {
        opacity: 1;
        filter: brightness(1.5) drop-shadow(0 0 40px rgba(139, 92, 246, 1));
        transform: scale(1.1);
      }
    }
    .animate-countdown-pulse {
      animation: countdown-pulse 0.6s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .animate-shake,
      .animate-particle,
      .animate-success-checkmark,
      .animate-draw-checkmark,
      .animate-success-pulse,
      .animate-error-x,
      .animate-draw-x,
      .animate-error-pulse,
      .animate-error-message,
      .animate-bonus-flash,
      .animate-bonus-icon-bounce,
      .animate-bonus-text,
      .animate-bonus-pulse,
      .animate-turn-transition,
      .animate-spin-bonus,
      .animate-bonus-activate,
      .animate-spin-slow,
      .animate-double-chance-glow,
      .animate-modern-ping,
      .animate-current-player-glow,
      .animate-timer-flash,
      .animate-bomb-pulse,
      .animate-countdown-pulse {
        animation: none !important;
      }
    }
  `}</style>
);

