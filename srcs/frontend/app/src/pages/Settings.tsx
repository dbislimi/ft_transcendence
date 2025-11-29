import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import SpaceBackground from "../Components/SpaceBackground";
import DisplaySettingsModal from "../Components/DisplaySettingsModal";
import GameSettingsModal from "../Components/GameSettingsModal";
import AccountSettingsModal from "../Components/AccountSettingsModal";
import { useUser } from "../context/UserContext";


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
          {t('common.close')}
        </button>
      </div>
    </div>
  );
};

export default function Settings() {
  const { t } = useTranslation();
  const { isAuthenticated } = useUser();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const openModal = (modalName: string) => setActiveModal(modalName);
  const closeModal = () => setActiveModal(null);

  return (
    <>
      <SpaceBackground />
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-4xl mx-auto px-6">
          
          {/* titre principal */}
          <div className="relative mb-12">
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-wider">
              {t('nav.settings') || 'ReGLAGES'}
            </h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            <button
              onClick={() => openModal('display')}
              className="action-btn-aesthetic"
            >
              <div className="flex flex-col items-center gap-3">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <h3 className="text-lg font-semibold btn-text-aesthetic">
                  {t('settings.display.title') || 'Affichage'}
                </h3>
                <p className="text-sm description-aesthetic">
                  {t('settings.display.description') || 'Theme, contraste, langue, arriere-plan, animations'}
                </p>
              </div>
            </button>
            
            {/* reglages de jeu */}
            <button
              onClick={() => openModal('game')}
              className="action-btn-aesthetic"
            >
              <div className="flex flex-col items-center gap-3">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold btn-text-aesthetic">
                  {t('settings.game.title') || 'Jeu'}
                </h3>
                <p className="text-sm description-aesthetic">
                  {t('settings.game.description') || 'Contrôles et preferences'}
                </p>
              </div>
            </button>
            
            {/* reglages de compte */}
            <button
              onClick={() => isAuthenticated && openModal('account')}
              className={`action-btn-aesthetic ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!isAuthenticated}
              title={!isAuthenticated ? t('settings.account.authRequired') || 'Connexion requise' : ''}
            >
              <div className="flex flex-col items-center gap-3">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h3 className="text-lg font-semibold btn-text-aesthetic">
                  {t('settings.account.title') || 'Compte'}
                </h3>
                <p className="text-sm description-aesthetic">
                  {t('settings.account.description') || 'Profil et securite'}
                </p>
                {!isAuthenticated && (
                  <p className="text-xs text-red-400 mt-1">
                    🔒 {t('settings.account.authRequired') || 'Connexion requise'}
                  </p>
                )}
              </div>
            </button>
            
            {/* retour à l'accueil */}
            <Link to="/" className="action-btn-aesthetic">
              <div className="flex flex-col items-center gap-3">
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <h3 className="text-lg font-semibold btn-text-aesthetic">
                  {t('settings.home.description') || 'Retour à l\'accueil'}
                </h3>
                <p className="text-sm description-aesthetic">
                  {t('settings.home.subtitle') || 'Retourner à la page principale'}
                </p>
              </div>
            </Link>
            
          </div>
          
        </div>
      </div>
      
      {/* Modales */}
      {activeModal === 'display' && (
        <DisplaySettingsModal isOpen={true} onClose={closeModal} />
      )}
      
      {activeModal === 'game' && (
        <GameSettingsModal
          isOpen={true}
          onClose={closeModal}
        />
      )}
      
      {activeModal === 'account' && (
        <AccountSettingsModal
          isOpen={true}
          onClose={closeModal}
        />
      )}
    </>
  );
}