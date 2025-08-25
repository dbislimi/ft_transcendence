import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Fond spatial avec gradient et étoiles */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 via-indigo-900 to-slate-900">
        {/* Couche de nébuleuse */}
        <div className="absolute inset-0 bg-gradient-radial from-purple-500/20 via-transparent to-transparent"></div>
        
        {/* Étoiles statiques */}
        <div className="absolute inset-0">
          {[...Array(100)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                opacity: 0.3 + Math.random() * 0.7
              }}
            />
          ))}
        </div>
        
        {/* Étoiles filantes occasionnelles */}
        <div className="absolute inset-0">
          {[...Array(5)].map((_, i) => (
            <div
              key={`shooting-${i}`}
              className="absolute w-0.5 h-0.5 bg-cyan-300 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
        
        {/* Particules colorées flottantes */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ['#F23041', '#F241E6', '#8C2A86', '#162059', '#41F2F2'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Contenu principal */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-4xl mx-auto px-6">
          
          {/* Titre principal */}
          <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-8 animate-pulse">
            TRANSCENDENCE
          </h1>
          
          {/* Sous-titre */}
          <p className="text-xl md:text-2xl text-gray-300 mb-16 font-light">
            {t('home.subtitle') || 'Défie tes limites dans l\'univers du Pong'}
          </p>
          
          {/* Grille des boutons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            
            {/* Bouton Connexion */}
            <Link to={"/Connection"}>
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                <button className="relative px-8 py-4 bg-black/50 backdrop-blur-sm rounded-lg leading-none flex items-center justify-center w-full border border-cyan-500/30">
                  <span className="text-cyan-400 group-hover:text-cyan-300 transition-colors duration-200 text-lg font-semibold">
                    {t('home.connectBtn') || 'Connexion'}
                  </span>
                </button>
              </div>
            </Link>
            
            {/* Bouton Inscription */}
            <Link to={"/Registration"}>
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                <button className="relative px-8 py-4 bg-black/50 backdrop-blur-sm rounded-lg leading-none flex items-center justify-center w-full border border-purple-500/30">
                  <span className="text-purple-400 group-hover:text-purple-300 transition-colors duration-200 text-lg font-semibold">
                    {t('home.registrationBtn') || 'Inscription'}
                  </span>
                </button>
              </div>
            </Link>
            
            {/* Bouton Jeu */}
            <Link to={"/game"}>
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                <button className="relative px-8 py-4 bg-black/50 backdrop-blur-sm rounded-lg leading-none flex items-center justify-center w-full border border-green-500/30">
                  <span className="text-green-400 group-hover:text-green-300 transition-colors duration-200 text-lg font-semibold">
                    {t('home.gameBtn') || 'Jouer'}
                  </span>
                </button>
              </div>
            </Link>
            
            {/* Bouton À propos de nous */}
            <Link to={"/about"}>
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                <button className="relative px-8 py-4 bg-black/50 backdrop-blur-sm rounded-lg leading-none flex items-center justify-center w-full border border-orange-500/30">
                  <span className="text-orange-400 group-hover:text-orange-300 transition-colors duration-200 text-lg font-semibold">
                    À propos de nous
                  </span>
                </button>
              </div>
            </Link>
            
          </div>
          
          {/* Footer avec info */}
          <div className="mt-20 text-gray-400 text-sm">
            <p>Prêt à transcender tes limites ?</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}   