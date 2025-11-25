import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobalBackground } from '../contexts/GlobalBackgroundContext';
import { useSettings } from '../contexts/SettingsContext';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShopModal({ isOpen, onClose }: ShopModalProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { currentBackground, setBackgroundForTheme, availableBackgrounds, lightBackgrounds, darkBackgrounds, lightBackgroundId, darkBackgroundId, isLoading } = useGlobalBackground();
  const [backgroundTab, setBackgroundTab] = useState<'light' | 'dark'>(settings.display.theme);

  const getBackgroundName = (bg: typeof lightBackgrounds[0]) => {
    const translationKey = `shop.backgrounds.${bg.id}.name`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : bg.name;
  };

  const getBackgroundDescription = (bg: typeof lightBackgrounds[0]) => {
    const translationKey = `shop.backgrounds.${bg.id}.description`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : bg.description;
  };

  if (!isOpen) return null;

  const handleBackgroundChange = (backgroundId: string, theme: 'light' | 'dark') => {
    console.log('[Shop] Changing background to:', backgroundId, 'for theme:', theme);
    setBackgroundForTheme(backgroundId, theme);
  };

  const filteredBackgrounds = backgroundTab === 'light' ? lightBackgrounds : darkBackgrounds;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🛒</span>
            <h2 className="text-2xl font-bold section-title-aesthetic">{t('shop.title') || 'Boutique'}</h2>
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
        <div className="flex h-[calc(90vh-120px)]">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
                <div className="flex gap-2 mb-4 bg-gray-800/50 rounded-lg p-1">
                  <button
                    onClick={() => setBackgroundTab('light')}
                    className={`flex-1 py-2 px-4 rounded-md transition-all duration-200 ${
                      backgroundTab === 'light'
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {t('settings.display.lightMode') || '☀️ Mode Clair'}
                  </button>
                  <button
                    onClick={() => setBackgroundTab('dark')}
                    className={`flex-1 py-2 px-4 rounded-md transition-all duration-200 ${
                      backgroundTab === 'dark'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {t('settings.display.darkMode') || '🌙 Mode Sombre'}
                  </button>
                </div>

                <div className="flex items-center justify-end mb-4">
                  <span className="text-sm text-gray-400">
                    {filteredBackgrounds.length} {t('shop.items.available') || 'disponibles'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredBackgrounds.map((bg) => {
                    const isActive = backgroundTab === 'light' 
                      ? lightBackgroundId === bg.id 
                      : darkBackgroundId === bg.id;
                    
                    return (
                      <button
                        key={bg.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleBackgroundChange(bg.id, backgroundTab);
                        }}
                        disabled={isLoading}
                        className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                          isActive
                            ? 'border-blue-500 shadow-lg shadow-blue-500/25'
                            : 'border-gray-600 hover:border-gray-500 hover:shadow-lg'
                        }`}
                      >
                      <div className="aspect-video w-full relative">
                        {bg.id === '42' ? (
                          <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center transition-all duration-300 group-hover:from-yellow-300 group-hover:to-orange-400">
                            <div className="text-center">
                              <div className="text-6xl font-bold text-black mb-2">?</div>
                              <div className="text-black text-xs font-semibold">42</div>
                            </div>
                          </div>
                        ) : bg.url ? (
                          <div
                            className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                            style={{ backgroundImage: `url(${bg.url})` }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center transition-all duration-300 group-hover:from-gray-700 group-hover:to-gray-800">
                            <span className="text-gray-400 text-xs">{bg.name}</span>
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                            <div className="bg-white/90 text-black px-3 py-1 rounded-full text-xs font-semibold">
                              {isActive ? t('shop.equipped') || 'Équipé' : t('shop.select') || 'Sélectionner'}
                            </div>
                          </div>
                        </div>
                        
                        {isLoading && isActive && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3">
                        <h4 className="font-medium text-white text-sm truncate">
                          {getBackgroundName(bg)}
                        </h4>
                        {isActive && (
                          <div className="flex items-center space-x-1 mt-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-xs text-green-400 font-medium">{t('shop.equipped') || 'Équipé'}</span>
                          </div>
                        )}
                      </div>
                    </button>
                    );
                  })}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}