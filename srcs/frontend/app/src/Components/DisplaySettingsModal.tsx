
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings, type Theme, type ContrastLevel, type FontSize, type Language } from '../contexts/SettingsContext';
import { useGlobalBackground } from '../contexts/GlobalBackgroundContext';

interface DisplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DisplaySettingsModal({ isOpen, onClose }: DisplaySettingsModalProps) {
  const { t } = useTranslation();
  const { settings, updateDisplaySettings } = useSettings();
  const { currentBackground, setBackground, setBackgroundForTheme, availableBackgrounds, lightBackgrounds, darkBackgrounds, lightBackgroundId, darkBackgroundId, isLoading } = useGlobalBackground();

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
  const [activeSection, setActiveSection] = useState<string>('theme');
  const [backgroundTab, setBackgroundTab] = useState<'light' | 'dark'>(settings.display.theme);
  const [localContrast, setLocalContrast] = useState<number>(settings.display.contrast);
  
  useEffect(() => {
    if (activeSection === 'background') {
      setBackgroundTab(settings.display.theme);
    }
  }, [activeSection, settings.display.theme]);

  useEffect(() => {
    setLocalContrast(settings.display.contrast);
  }, [settings.display.contrast]);

  if (!isOpen) return null;

  const languageOptions: { key: Language; label: string; flag: string }[] = [
    { key: 'fr', label: 'Français', flag: '🇫🇷' },
    { key: 'en', label: 'English', flag: '🇺🇸' },
    { key: 'es', label: 'Español', flag: '🇪🇸' },
    { key: 'ar', label: 'العربية', flag: '🇸🇦' },
    { key: 'ru', label: 'Русский', flag: '🇷🇺' },
  ];

  const sections = [
    { id: 'theme', label: t('settings.display.theme') || 'Theme', icon: '🎨' },
    { id: 'accessibility', label: t('settings.display.accessibility') || 'Accessibilite', icon: '♿' },
    { id: 'language', label: t('settings.display.language') || 'Langue', icon: '🌍' },
    { id: 'background', label: t('settings.display.background') || 'Arriere-plan', icon: '🖼️' },
    { id: 'performance', label: t('settings.display.performance') || 'Performance', icon: '⚡' },
  ];

  const handleThemeChange = (theme: Theme) => {
    updateDisplaySettings({ theme });
  };

  const handleContrastChange = (contrast: ContrastLevel) => {
    console.log('[DisplaySettings] Changing contrast to:', contrast);
    setLocalContrast(contrast);
    updateDisplaySettings({ contrast });
  };

  const getContrastLabel = (value: number): string => {
    if (value <= 0.7) return t('settings.display.contrastVeryLow') || 'Tres faible';
    if (value <= 0.9) return t('settings.display.contrastLow') || 'Faible';
    if (value >= 0.95 && value <= 1.05) return t('settings.display.contrastNormal') || 'Normal';
    if (value <= 1.5) return t('settings.display.contrastHigh') || 'eleve';
    return t('settings.display.contrastVeryHigh') || 'Tres eleve';
  };

  const handleLanguageChange = (language: Language) => {
    updateDisplaySettings({ language });
  };

  const handleFontSizeChange = (fontSize: FontSize) => {
    updateDisplaySettings({ fontSize });
  };

  const handleAnimationsChange = (animations: boolean) => {
    updateDisplaySettings({ animations });
  };

  const handleEnergySaverChange = (energySaver: boolean) => {
    updateDisplaySettings({ energySaver });
  };

  const handleBackgroundChange = (backgroundId: string, theme: 'light' | 'dark') => {
    console.log('[Background] Changement vers:', backgroundId, 'pour le theme:', theme);
    setBackgroundForTheme(backgroundId, theme);
  };

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
        <div className="flex items-center justify-between p-6 border-b border-gray-600/30">
          <h2 className="text-2xl font-bold section-title-aesthetic flex items-center gap-3">
            <span className="text-3xl">👁️</span>
            {t('settings.display.title') || 'Reglages d\'affichage'}
          </h2>
          <button
            onClick={onClose}
            className="close-btn-aesthetic"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[600px]">
          <div className="w-64 bg-gray-800/50 border-r border-gray-600/30 p-4">
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                    activeSection === section.id
                      ? 'action-btn-aesthetic'
                      : 'action-btn-aesthetic'
                  }`}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="btn-text-aesthetic">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeSection === 'theme' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">{t('settings.display.appearance') || 'Apparence'}</h3>
                
                <div className="settings-section rounded-xl p-6">
                  <h4 className="text-lg font-medium text-white mb-4">{t('settings.display.theme') || 'Theme'}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                        settings.display.theme === 'light'
                          ? 'action-btn-aesthetic'
                          : 'action-btn-aesthetic'
                      }`}
                    >
                      <div className="w-12 h-8 bg-gradient-to-br from-white to-gray-200 rounded border shadow-sm"></div>
                      <span className="btn-text-aesthetic text-sm">{t('settings.display.themeLight') || 'Clair'}</span>
                    </button>
                    
                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                        settings.display.theme === 'dark'
                          ? 'action-btn-aesthetic'
                          : 'action-btn-aesthetic'
                      }`}
                    >
                      <div className="w-12 h-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded border shadow-sm"></div>
                      <span className="btn-text-aesthetic text-sm">{t('settings.display.themeDark') || 'Sombre'}</span>
                    </button>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-white mb-2">
                          {t('settings.display.autoChangeBackground') || 'Changement automatique de fond'}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {t('settings.display.autoChangeBackgroundDesc') || 'Change automatiquement le fond d\'ecran lorsque vous basculez entre les modes clair et sombre'}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input
                          type="checkbox"
                          checked={settings.display.autoChangeBackground}
                          onChange={(e) => updateDisplaySettings({ autoChangeBackground: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="settings-section rounded-xl p-6">
                  <h4 className="text-lg font-medium text-white mb-4">{t('settings.display.fontSize') || 'Taille du texte'}</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                      <button
                        key={size}
                        onClick={() => handleFontSizeChange(size)}
                        className={`p-3 rounded-lg border transition-all duration-200 ${
                          settings.display.fontSize === size
                            ? 'action-btn-aesthetic'
                            : 'action-btn-aesthetic'
                        }`}
                      >
                        <div className={`font-medium btn-text-aesthetic ${
                          size === 'small' ? 'text-sm' : 
                          size === 'large' ? 'text-lg' : 'text-base'
                        }`}>
                          Aa
                        </div>
                        <div className="btn-text-aesthetic text-xs mt-1 capitalize">{size === 'small' ? (t('settings.display.fontSmall') || 'Petit') : size === 'medium' ? (t('settings.display.fontMedium') || 'Moyen') : (t('settings.display.fontLarge') || 'Grand')}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'accessibility' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">{t('settings.display.accessibility') || 'Accessibilite'}</h3>
                
                <div className="settings-section rounded-xl p-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-white">{t('settings.display.contrast') || 'Contraste'}</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-blue-400 font-medium">
                          {getContrastLabel(localContrast)}
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                          {localContrast.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-6">
                      {t('settings.display.contrastDesc') || 'Ajuste le contraste et la luminosite du texte'}
                    </p>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={localContrast}
                          onChange={(e) => handleContrastChange(parseFloat(e.target.value))}
                          className="w-full slider-contrast"
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{t('settings.display.contrastLow') || 'Faible'}</span>
                        <span>{t('settings.display.contrastNormal') || 'Normal'}</span>
                        <span>{t('settings.display.contrastHigh') || 'eleve'}</span>
                      </div>
                      
                      <div className="mt-4 p-4 rounded-lg bg-gray-700/50 border border-gray-600">
                        <p className="text-sm mb-2 text-gray-300">
                          {t('settings.display.contrastPreview') || 'Aperçu du texte avec ce niveau de contraste'}
                        </p>
                        <p className="text-base" style={{ filter: `contrast(${localContrast}) brightness(${Math.min(1.0, 0.5 + (localContrast - 0.5) * 0.5)})` }}>
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'language' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">{t('settings.display.language') || 'Langue'}</h3>
                
                <div className="settings-section rounded-xl p-6">
                  <div className="grid grid-cols-1 gap-3">
                    {languageOptions.map((lang) => (
                      <button
                        key={lang.key}
                        onClick={() => handleLanguageChange(lang.key)}
                        className={`p-4 rounded-lg border transition-all duration-200 flex items-center gap-3 ${
                          settings.display.language === lang.key
                            ? 'action-btn-aesthetic'
                            : 'action-btn-aesthetic'
                        }`}
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <div className="flex-1">
                          <div className="font-medium btn-text-aesthetic">{lang.label}</div>
                        </div>
                        
                        {settings.display.language === lang.key && (
                          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'background' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">{t('settings.display.background') || 'Arriere-plan'}</h3>
                
                <div className="settings-section rounded-xl p-6">
                  <div className="flex gap-2 mb-6 bg-gray-800/50 rounded-lg p-1">
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

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {(backgroundTab === 'light' ? lightBackgrounds : darkBackgrounds).map((bg) => {
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
                            {bg.url ? (
                              <div
                                className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                                style={{ backgroundImage: `url(${bg.url})` }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center transition-all duration-300 group-hover:from-gray-700 group-hover:to-gray-800">
                                <span className="text-gray-400 text-xs">{bg.name}</span>
                              </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
                            
                            {isLoading && isActive && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                          
                          <div className="p-3 text-center bg-gray-800/90">
                            <h5 className="text-white text-sm font-medium mb-1">
                              {getBackgroundName(bg)}
                            </h5>
                            <p className="text-gray-400 text-xs">
                              {getBackgroundDescription(bg)}
                            </p>
                          </div>
                          
                          {isActive && (
                            <>
                              <div className="absolute top-3 right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="absolute bottom-3 left-3 px-2 py-1 bg-blue-500 text-white text-xs rounded-full font-medium">
                                {t('settings.display.equipped') || 'equipe'}
                              </div>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      {t('settings.display.backgroundTip') || '💡 Astuce : Choisissez un arriere-plan pour le mode clair et un pour le mode sombre. L\'arriere-plan changera automatiquement lorsque vous basculerez entre les modes.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'performance' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-4">{t('settings.display.performanceTitle') || t('settings.display.performance') || 'Performance et animations'}</h3>
                
                <div className="settings-section rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-medium text-white">{t('settings.display.animations') || 'Animations'}</h4>
                      <p className="text-gray-400 text-sm">{t('settings.display.animationsDesc') || 'Active les effets visuels et transitions'}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.display.animations}
                        onChange={(e) => handleAnimationsChange(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="settings-section rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-medium text-white">{t('settings.display.energySaver') || 'Mode economie d\'energie'}</h4>
                      <p className="text-gray-400 text-sm">{t('settings.display.energySaverDesc') || 'Reduit les effets visuels pour economiser la batterie'}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.display.energySaver}
                        onChange={(e) => handleEnergySaverChange(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-600/30">
          <div className="text-sm text-gray-400">
            {t('settings.display.autoSave') || 'Les modifications sont sauvegardees automatiquement'}
          </div>
          <button
            onClick={onClose}
            className="action-btn-aesthetic"
          >
            <span className="btn-text-aesthetic">{t('settings.display.close') || 'Fermer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}