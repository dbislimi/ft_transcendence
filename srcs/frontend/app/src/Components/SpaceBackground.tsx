import React, { useState, useEffect } from "react";

interface SpaceBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export default function SpaceBackground({ children, className = "" }: SpaceBackgroundProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      className={`relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${className}`}
      onMouseMove={handleMouseMove}
    >
      {/* Fond spatial dynamique */}
      <div className="absolute inset-0">
        {/* Nébuleuse animée */}
        <div 
          className="absolute inset-0 bg-gradient-radial from-blue-500/5 via-purple-500/3 to-transparent transition-all duration-1000"
          style={{
            transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`
          }}
        />
        
        {/* Grille spatiale subtile */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(100, 116, 139, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(100, 116, 139, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>
        
        {/* Étoiles statiques avec différentes tailles */}
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full bg-gray-400 transition-all duration-1000 ${
              i % 3 === 0 ? 'w-1 h-1' : i % 3 === 1 ? 'w-0.5 h-0.5' : 'w-px h-px'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.1 + Math.random() * 0.3,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${4 + Math.random() * 3}s`,
              transform: `translate(${mousePosition.x * 0.001}px, ${mousePosition.y * 0.001}px)`
            }}
          />
        ))}
        
        {/* Étoiles filantes rares */}
        {[...Array(2)].map((_, i) => (
          <div
            key={`shooting-${i}`}
            className="absolute w-0.5 h-0.5 bg-gray-300 rounded-full animate-shooting-star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`
            }}
          />
        ))}
        
        {/* Particules flottantes */}
        {[...Array(20)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 rounded-full bg-gradient-to-r from-gray-400 to-gray-300 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.1 + Math.random() * 0.2,
              animationDelay: `${Math.random() * 6}s`
            }}
          />
        ))}
      </div>
      
      {/* Contenu principal avec animation d'entrée */}
      <div className={`relative z-10 transition-all duration-1000 ${
        isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        {children}
      </div>
    </div>
  );
}
