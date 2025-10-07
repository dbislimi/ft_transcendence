import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import SpaceBackground from "../Components/SpaceBackground";
import BackgroundPicker from "../Components/BackgroundPicker";

// Composants modaux
const DisplaySettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-white mb-4">{t('ui.background.title') || 'Arrière-plans'}</h3>

        <BackgroundPicker game="bombparty" />
        
        <button
          onClick={onClose}
          className="mt-6 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t('common.close') || 'Fermer'}
        </button>
      </div>
    </div>
  );
};

const AudioSettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-white mb-4">Paramètres audio</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm mb-2">Volume musique</label>
            <input type="range" min="0" max="100" defaultValue="70" className="w-full" />
          </div>
          
          <div>
            <label className="block text-slate-300 text-sm mb-2">Volume effets sonores</label>
            <input type="range" min="0" max="100" defaultValue="80" className="w-full" />
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

const PlaceholderModal = ({ 
  isOpen, 
  onClose, 
  title, 
  description 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  description: string; 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <p className="text-slate-300 mb-6">{description}</p>
        
        <button
          onClick={onClose}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

export default function Settings() {
  const { t } = useTranslation();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const openModal = (modalName: string) => setActiveModal(modalName);
  const closeModal = () => setActiveModal(null);

  return (
    <>
      <SpaceBackground />
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-4xl mx-auto px-6">
          
          {/* Titre principal */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-100 blur-xl opacity-20 animate-pulse"></div>
            <h1 className="relative text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-gray-100 to-white tracking-wider">
              {t('nav.settings') || 'RÉGLAGES'}
            </h1>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded-full opacity-50"></div>
          </div>
          
          {/* Grille des options de réglages */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            {/* Réglages d'affichage */}
            <div className="group">
              <button
                onClick={() => openModal('display')}
                className="w-full"
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-md border border-gray-600/30 hover:border-gray-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors duration-300">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-200 group-hover:text-white transition-colors duration-300 mb-2">
                      Affichage
                    </h3>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                      Thème, contraste et langue
                    </p>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Réglages audio */}
            <div className="group">
              <button
                onClick={() => openModal('audio')}
                className="w-full"
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-md border border-gray-600/30 hover:border-gray-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/5 to-green-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors duration-300">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-200 group-hover:text-white transition-colors duration-300 mb-2">
                      Audio
                    </h3>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                      Volume et effets sonores
                    </p>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Réglages de jeu */}
            <div className="group">
              <button
                onClick={() => openModal('game')}
                className="w-full"
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-md border border-gray-600/30 hover:border-gray-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors duration-300">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-200 group-hover:text-white transition-colors duration-300 mb-2">
                      Jeu
                    </h3>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                      Contrôles et préférences
                    </p>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Réglages de compte */}
            <div className="group">
              <button
                onClick={() => openModal('account')}
                className="w-full"
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-md border border-gray-600/30 hover:border-gray-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors duration-300">
                      <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-200 group-hover:text-white transition-colors duration-300 mb-2">
                      Compte
                    </h3>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                      Profil et sécurité
                    </p>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Réglages avancés */}
            <div className="group">
              <button
                onClick={() => openModal('advanced')}
                className="w-full"
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-md border border-gray-600/30 hover:border-gray-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors duration-300">
                      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-200 group-hover:text-white transition-colors duration-300 mb-2">
                      Avancés
                    </h3>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                      Options techniques
                    </p>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Retour à l'accueil */}
            <div className="group">
              <Link to="/">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-md border border-gray-600/30 hover:border-gray-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/50">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-500/0 via-gray-500/5 to-gray-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-500/20 flex items-center justify-center group-hover:bg-gray-500/30 transition-colors duration-300">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-200 group-hover:text-white transition-colors duration-300 mb-2">
                      Accueil
                    </h3>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                      Retour à l'accueil
                    </p>
                  </div>
                </div>
              </Link>
            </div>
            
          </div>
          
        </div>
      </div>

      {/* Modaux */}
      <DisplaySettingsModal 
        isOpen={activeModal === 'display'} 
        onClose={closeModal} 
      />
      
      <AudioSettingsModal 
        isOpen={activeModal === 'audio'} 
        onClose={closeModal} 
      />
      
      <PlaceholderModal 
        isOpen={activeModal === 'game'} 
        onClose={closeModal}
        title="Paramètres de jeu"
        description="Les paramètres de jeu seront disponibles dans une prochaine version."
      />
      
      <PlaceholderModal 
        isOpen={activeModal === 'account'} 
        onClose={closeModal}
        title="Paramètres de compte"
        description="La gestion du compte sera disponible dans une prochaine version."
      />
      
      <PlaceholderModal 
        isOpen={activeModal === 'advanced'} 
        onClose={closeModal}
        title="Paramètres avancés"
        description="Les paramètres avancés seront disponibles dans une prochaine version."
      />
    </>
  );
}