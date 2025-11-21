import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings, type Language } from '../contexts/SettingsContext';

interface LanguageOption {
  key: Language;
  label: string;
  flag: string;
  nativeName: string;
}

const languageOptions: LanguageOption[] = [
  { key: 'fr', label: 'Français', flag: '🇫🇷', nativeName: 'Français' },
  { key: 'en', label: 'English', flag: '🇺🇸', nativeName: 'English' },
  { key: 'es', label: 'Español', flag: '🇪🇸', nativeName: 'Español' },
  { key: 'ar', label: 'العربية', flag: '🇸🇦', nativeName: 'العربية' },
  { key: 'ru', label: 'Русский', flag: '🇷🇺', nativeName: 'Русский' },
];

export default function LanguageDropdown() {
  const { i18n } = useTranslation();
  const { settings, updateDisplaySettings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languageOptions.find(lang => lang.key === settings.display.language) || languageOptions[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (language: Language) => {
    updateDisplaySettings({ language });
    i18n.changeLanguage(language);
    setIsOpen(false);
    
    setTimeout(() => {
      window.dispatchEvent(new Event('languageChanged'));
    }, 100);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative overflow-hidden rounded-lg px-4 py-2 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-500/30 hover:border-slate-400/50 transition-all duration-300 hover:scale-105 flex items-center gap-2 min-w-[100px]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600/0 to-slate-500/0 group-hover:from-slate-600/20 group-hover:to-slate-500/20 transition-all duration-300"></div>
        
        <span className="relative text-xl">{currentLanguage.flag}</span>
        <span className="relative text-slate-300 group-hover:text-slate-200 font-medium text-sm">
          {currentLanguage.key.toUpperCase()}
        </span>
        
        <svg 
          className={`relative w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-all duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800/95 backdrop-blur-md border border-slate-600/50 rounded-xl shadow-2xl z-50 overflow-hidden animate-settings-slide">
          <div className="py-2">
            {languageOptions.map((lang) => (
              <button
                key={lang.key}
                onClick={() => handleLanguageChange(lang.key)}
                className={`w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-all duration-200 flex items-center gap-3 ${
                  settings.display.language === lang.key 
                    ? 'bg-blue-600/20 text-blue-300 border-r-2 border-blue-500' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{lang.nativeName}</div>
                  <div className="text-xs text-slate-400">{lang.label}</div>
                </div>
                {settings.display.language === lang.key && (
                  <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        </div>
      )}
    </div>
  );
}
