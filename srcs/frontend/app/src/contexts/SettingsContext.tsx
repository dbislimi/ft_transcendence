/**
 * Context global des réglages de l'application
 * Gère tous les paramètres utilisateur avec persistance localStorage
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type Theme = 'light' | 'dark';
export type ContrastLevel = number; // 0.5 à 2.0
export type FontSize = 'small' | 'medium' | 'large';
export type Language = 'fr' | 'en' | 'es' | 'ar' | 'ru';

export interface DisplaySettings {
  theme: Theme;
  contrast: ContrastLevel;
  language: Language;
  fontSize: FontSize;
  animations: boolean;
  energySaver: boolean;
}

export interface GameSettings {
  controls: {
    pongUp: string;
    pongDown: string;
    bombPartySubmit: string;
  };
  preferences: {
    showFPS: boolean;
    reducedMotion: boolean;
  };
}

export interface AccountSettings {
  profile: {
    displayName: string;
    email: string;
  };
  security: {
    twoFactorEnabled: boolean;
  };
}

export interface AdvancedSettings {
  technical: {
    debugMode: boolean;
    performanceMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

export interface AppSettings {
  display: DisplaySettings;
  game: GameSettings;
  account: AccountSettings;
  advanced: AdvancedSettings;
}

// Valeurs par défaut
const DEFAULT_SETTINGS: AppSettings = {
  display: {
    theme: 'dark',
    contrast: 1.0, 
    language: 'fr',
    fontSize: 'medium',
    animations: true,
    energySaver: false,
  },
  game: {
    controls: {
      pongUp: 'ArrowUp',
      pongDown: 'ArrowDown',
      bombPartySubmit: 'Enter',
    },
    preferences: {
      showFPS: false,
      reducedMotion: false,
    },
  },
  account: {
    profile: {
      displayName: '',
      email: '',
    },
    security: {
      twoFactorEnabled: false,
    },
  },
  advanced: {
    technical: {
      debugMode: false,
      performanceMode: false,
      logLevel: 'warn',
    },
  },
};

interface SettingsContextValue {
  settings: AppSettings;
  updateDisplaySettings: (updates: Partial<DisplaySettings>) => void;
  updateGameSettings: (updates: Partial<GameSettings>) => void;
  updateAccountSettings: (updates: Partial<AccountSettings>) => void;
  updateAdvancedSettings: (updates: Partial<AdvancedSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const { i18n } = useTranslation();

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        const loadedSettings = { ...DEFAULT_SETTINGS, ...parsed };
        setSettings(loadedSettings);
        
        if (loadedSettings.display.language && i18n.language !== loadedSettings.display.language) {
          i18n.changeLanguage(loadedSettings.display.language);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des réglages:', error);
    }
  }, [i18n]);

  useEffect(() => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des réglages:', error);
    }
  }, [settings]);

  useEffect(() => {
    const { theme, contrast, language, fontSize, animations, energySaver } = settings.display;
    // Thème
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('dark', theme === 'dark');
    // Contraste (de 0.5 à 2.0)
    document.documentElement.style.setProperty('--contrast-level', contrast.toString());
    // Ajuster la luminosité du texte selon le contraste
    const textBrightness = Math.min(1.0, 0.5 + (contrast - 0.5) * 0.5);
    document.documentElement.style.setProperty('--text-brightness', textBrightness.toString());
    // Taille de police
    document.documentElement.classList.remove('text-small', 'text-medium', 'text-large');
    document.documentElement.classList.add(`text-${fontSize}`);
    // Animations
    document.documentElement.classList.toggle('reduce-motion', !animations);
    // Mode economie d´energie
    document.documentElement.classList.toggle('energy-saver', energySaver);
    // Langue
    i18n.changeLanguage(language);
  }, [settings.display, i18n]);

  const updateDisplaySettings = (updates: Partial<DisplaySettings>) => {
    setSettings(prev => ({
      ...prev,
      display: { ...prev.display, ...updates }
    }));
  };

  const updateGameSettings = (updates: Partial<GameSettings>) => {
    setSettings(prev => ({
      ...prev,
      game: { ...prev.game, ...updates }
    }));
  };

  const updateAccountSettings = (updates: Partial<AccountSettings>) => {
    setSettings(prev => ({
      ...prev,
      account: { ...prev.account, ...updates }
    }));
  };

  const updateAdvancedSettings = (updates: Partial<AdvancedSettings>) => {
    setSettings(prev => ({
      ...prev,
      advanced: { ...prev.advanced, ...updates }
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('app-settings');
  };

  const exportSettings = () => {
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = (settingsJson: string): boolean => {
    try {
      const imported = JSON.parse(settingsJson);
      setSettings({ ...DEFAULT_SETTINGS, ...imported });
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'import des réglages:', error);
      return false;
    }
  };

  const value: SettingsContextValue = {
    settings,
    updateDisplaySettings,
    updateGameSettings,
    updateAccountSettings,
    updateAdvancedSettings,
    resetSettings,
    exportSettings,
    importSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
