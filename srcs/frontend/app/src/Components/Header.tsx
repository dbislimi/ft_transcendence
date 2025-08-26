import { Link } from "react-router-dom";
import Logo from "../assets/logo.png";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import ContrastToggle from "./ContrastToggle";
import { useTranslation } from "react-i18next";

export default function Header() {
  const { t } = useTranslation();
  
  return (
    <header className="w-full bg-gradient-to-r from-slate-900/95 via-purple-900/95 to-slate-900/95 backdrop-blur-md border-b border-purple-500/20 shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          
          {/* Section gauche - Lien Inscription */}
          <div className="flex items-center">
            <Link 
              to="/Registration" 
              className="group relative overflow-hidden rounded-lg px-6 py-3 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/0 to-blue-600/0 group-hover:from-cyan-600/20 group-hover:to-blue-600/20 transition-all duration-300"></div>
              <span className="relative text-cyan-300 group-hover:text-cyan-200 font-semibold transition-colors duration-300">
                {t('nav.signin')}
              </span>
            </Link>
          </div>
          
          {/* Section centre - Logo */}
          <Link to={"/"} className="group relative">
            <div className="relative">
              {/* Effet de lueur autour du logo */}
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400/20 via-purple-400/20 to-pink-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
              
              {/* Logo avec animations */}
              <div className="relative size-20 bg-gradient-to-br from-slate-800 to-purple-900 rounded-full p-2 border border-purple-500/30 group-hover:border-purple-400/50 transition-all duration-300 group-hover:scale-110">
                <img
                  src={Logo}
                  className="size-full object-contain transition-all duration-300 group-hover:rotate-12"
                  alt="Transcendence Logo"
                />
              </div>
              
              {/* Particules flottantes autour du logo */}
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-ping opacity-75" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 rounded-full animate-ping opacity-75" style={{animationDelay: '1s'}}></div>
            </div>
          </Link>
          
          {/* Section droite - Contrôles et Réglages */}
          <div className="flex items-center gap-4">
            {/* Sélecteur de langue amélioré */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div className="relative">
                <LanguageSwitcher />
              </div>
            </div>
            
            {/* Toggle de contraste */}
            <ContrastToggle />
            
            {/* Toggle de thème */}
            <ThemeToggle />
            
            {/* Bouton Réglages */}
            <button 
              type="button" 
              className="group relative overflow-hidden rounded-lg px-6 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 to-pink-600/0 group-hover:from-purple-600/20 group-hover:to-pink-600/20 transition-all duration-300"></div>
              <span className="relative text-purple-300 group-hover:text-purple-200 font-semibold transition-colors duration-300">
                {t('nav.settings')}
              </span>
            </button>
          </div>
          
        </div>
      </div>
    </header>
  );
}