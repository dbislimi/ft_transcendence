import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
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
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
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
      <div className={`relative z-10 flex items-center justify-center min-h-screen transition-all duration-1000 ${
        isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <div className="text-center max-w-6xl mx-auto px-6">
          
          {/* Logo/Titre principal avec effet de profondeur */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-100 blur-xl opacity-20 animate-pulse"></div>
            <h1 className="relative text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-gray-100 to-white tracking-wider">
              TRANSCENDENCE
            </h1>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded-full opacity-50"></div>
          </div>
          
          {/* Message de bienvenue si connecté */}
          {isAuthenticated && user && (
            <div className="mb-8">
              <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-full px-6 py-3">
                <span className="text-2xl">👋</span>
                <p className="text-green-300 text-lg font-medium">
                  Bienvenue, {user.name} !
                </p>
              </div>
            </div>
          )}
          
          {/* Sous-titre avec animation */}
          <div className="mb-20">
            <p className="text-xl md:text-2xl text-gray-400 font-light leading-relaxed max-w-3xl mx-auto">
              {t('home.subtitle') || 'Défie tes limites dans l\'univers du Pong'}
            </p>
            <div className="mt-4 flex justify-center space-x-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
          
          {/* Grille des boutons améliorée */}
          <div className={`grid gap-8 max-w-6xl mx-auto ${
            isAuthenticated ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}>
            
            {/* Boutons de connexion et inscription seulement si non connecté */}
            {!isAuthenticated && (
              <>
                {/* Bouton Connexion */}
                <Link to={"/Connection"} className="group">
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-md border border-gray-600/30 hover:border-gray-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors duration-300">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-200 group-hover:text-white transition-colors duration-300 mb-2">
                        {t('home.connectBtn') || 'Connexion'}
                      </h3>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                        Accéder à ton compte
                      </p>
                    </div>
                  </div>
                </Link>
                
                {/* Bouton Inscription */}
                <Link to={"/Registration"} className="group">
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-md border border-gray-600/30 hover:border-gray-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/5 to-green-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors duration-300">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-200 group-hover:text-white transition-colors duration-300 mb-2">
                        {t('home.registrationBtn') || 'Inscription'}
                      </h3>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                        Rejoindre l'aventure
                      </p>
                    </div>
                  </div>
                </Link>
              </>
            )}
            
            {/* Bouton Jeu */}
            <Link to={"/game"} className="group">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-md border border-gray-600/30 hover:border-gray-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors duration-300">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-200 group-hover:text-white transition-colors duration-300 mb-2">
                    {t('home.gameBtn') || 'Jouer'}
                  </h3>
                  <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                    Lancer une partie
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Bouton À propos de nous */}
            <Link to={"/about"} className="group">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-md border border-gray-600/30 hover:border-gray-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors duration-300">
                    <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-200 group-hover:text-white transition-colors duration-300 mb-2">
                    {t('home.aboutBtn') || 'À propos de nous'}
                  </h3>
                  <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                    Découvrir l'équipe
                  </p>
                </div>
              </div>
            </Link>
            
          </div>
          
          {/* Footer avec statistiques */}
          <div className="mt-24 text-center">
            <div className="inline-flex items-center space-x-8 text-gray-500 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Prêt à transcender tes limites ?</span>
              </div>
              <div className="w-px h-4 bg-gray-600"></div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Performance optimale</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}