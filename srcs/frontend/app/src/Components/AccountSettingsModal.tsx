
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobalBackground } from '../contexts/GlobalBackgroundContext';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const { t } = useTranslation();
  const { lightBackgroundId, darkBackgroundId, availableBackgrounds } = useGlobalBackground();

  const lightBackground = useMemo(() => {    return availableBackgrounds.find(bg => bg.id === lightBackgroundId) || availableBackgrounds[0];
  }, [lightBackgroundId, availableBackgrounds]);
  
  const darkBackground = useMemo(() => {
    return availableBackgrounds.find(bg => bg.id === darkBackgroundId) || availableBackgrounds[0];
  }, [darkBackgroundId, availableBackgrounds]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="settings-modal rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-settings-slide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">👤</span>
            <h2 className="text-2xl font-bold section-title-aesthetic">
              {t('settings.account.title') || 'Réglages de compte'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="close-btn-aesthetic"
            aria-label={t('common.close') || 'Fermer'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">{t('settings.account.preferences') || 'Préférences'}</h3>
            
            <div className="settings-section rounded-xl p-6">
              <h4 className="text-lg font-medium text-white mb-4">
                {t('settings.account.backgroundPreview') || 'Aperçu des arrière-plans'}
              </h4>
              <p className="text-gray-300 mb-6">
                {t('settings.account.backgroundPreviewDesc') || 'Aperçus des arrière-plans sélectionnés pour chaque mode'}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h5 className="text-md font-semibold text-white flex items-center gap-2">
                    <span>☀️</span>
                    {t('settings.account.lightModeBackground') || 'Mode Clair'}
                  </h5>
                  <div className="relative rounded-lg overflow-hidden border-2 border-yellow-400/50">
                    <div className="aspect-video w-full relative">
                      {lightBackground.url ? (
                        <div
                          className="w-full h-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${lightBackground.url})` }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                          <span className="text-gray-400 text-sm">{lightBackground.name}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20"></div>
                    </div>
                    <div className="p-3 bg-gray-800/90">
                      <p className="text-white text-sm font-medium">{lightBackground.name}</p>
                      <p className="text-gray-400 text-xs">{lightBackground.description}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h5 className="text-md font-semibold text-white flex items-center gap-2">
                    <span>🌙</span>
                    {t('settings.account.darkModeBackground') || 'Mode Sombre'}
                  </h5>
                  <div className="relative rounded-lg overflow-hidden border-2 border-blue-400/50">
                    <div className="aspect-video w-full relative">
                      {darkBackground.url ? (
                        <div
                          className="w-full h-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${darkBackground.url})` }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                          <span className="text-gray-400 text-sm">{darkBackground.name}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20"></div>
                    </div>
                    <div className="p-3 bg-gray-800/90">
                      <p className="text-white text-sm font-medium">{darkBackground.name}</p>
                      <p className="text-gray-400 text-xs">{darkBackground.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

