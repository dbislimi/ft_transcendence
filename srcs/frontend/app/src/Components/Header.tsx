import { Link } from "react-router-dom";
import Logo from "../assets/logo.png";
import LanguageDropdown from "./LanguageDropdown";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";

export default function Header() {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();
  
  return (
    <header className="relative z-20 w-full backdrop-blur-xl border-b" style={{
      background: 'var(--bg-header)',
      borderColor: 'rgba(148, 163, 184, 0.3)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    }}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/profile" 
                  className="nav-btn-aesthetic"
                >
                  <span className="label-aesthetic">
                    {t('nav.profile') || 'Profil'}
                  </span>
                </Link>
                <Link 
                  to="/stats" 
                  className="nav-btn-aesthetic"
                >
                  <span className="label-aesthetic">
                    Statistiques
                  </span>
                </Link>
              </>
            ) : (
              <Link 
                to="/Registration" 
                className="nav-btn-aesthetic inline-block"
              >
                <span className="label-aesthetic">
                  {t('nav.signin')}
                </span>
              </Link>
            )}            
          </div>
          
          <Link to={"/"} className="group relative">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400/20 via-purple-400/20 to-pink-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
              
              <div className="relative size-20 bg-gradient-to-br from-slate-800 to-purple-900 rounded-full p-2 border border-purple-500/30 group-hover:border-purple-400/50 transition-all duration-300 group-hover:scale-110">
                <img
                  src={Logo}
                  className="size-full object-contain transition-all duration-300 group-hover:rotate-12"
                  alt="Transcendence Logo"
                />
              </div>
              
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-ping opacity-75" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 rounded-full animate-ping opacity-75" style={{animationDelay: '1s'}}></div>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <LanguageDropdown />
            
            <ThemeToggle />
            
            <Link to="/settings" className="nav-btn-aesthetic inline-block">
              <span className="label-aesthetic">
                {t('nav.settings')}
              </span>
            </Link>

            {isAuthenticated && (
              <button
                onClick={logout}
                className="group relative overflow-hidden rounded-lg px-4 py-3 bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/30 hover:border-red-400/50 transition-all duration-300 hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 to-pink-600/0 group-hover:from-red-600/20 group-hover:to-pink-600/20 transition-all duration-300"></div>
                <span className="relative text-red-300 group-hover:text-red-200 font-semibold transition-colors duration-300">
                  {t('nav.logout') || 'Déconnexion'}
                </span>
              </button>
            )}
          </div>
          
        </div>
      </div>
    </header>
  );
}