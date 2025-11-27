import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { allBackgrounds, getBackgroundById, type BackgroundItem } from '../backgrounds/catalog';
import { analyzeBackground, applyColorScheme, type ColorScheme, isBackgroundDark } from '../utils/colorAdaptation';
import { useSettings } from './SettingsContext';

interface GlobalBackgroundContextValue {
  currentBackground: BackgroundItem;
  setBackground: (id: string) => void;
  setBackgroundForTheme: (id: string, theme: 'light' | 'dark') => void;
  availableBackgrounds: BackgroundItem[];
  lightBackgrounds: BackgroundItem[];
  darkBackgrounds: BackgroundItem[];
  lightBackgroundId: string;
  darkBackgroundId: string;
  isLoading: boolean;
  currentColorScheme: ColorScheme | null;
}

const GlobalBackgroundContext = createContext<GlobalBackgroundContextValue | undefined>(undefined);

const STORAGE_KEY_LIGHT = 'ui.background.global.light';
const STORAGE_KEY_DARK = 'ui.background.global.dark';
const CSS_CLASS_PREFIX = 'bg-active-';

export function GlobalBackgroundProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const currentTheme = settings.display.theme;
  
  const [lightBackgroundId, setLightBackgroundId] = useState<string>('default');
  const [darkBackgroundId, setDarkBackgroundId] = useState<string>('default');
  const [lastUsedBackgroundId, setLastUsedBackgroundId] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [currentColorScheme, setCurrentColorScheme] = useState<ColorScheme | null>(null);

  useEffect(() => {
    try {
      const savedLightId = localStorage.getItem(STORAGE_KEY_LIGHT);
      const savedDarkId = localStorage.getItem(STORAGE_KEY_DARK);
      
      if (savedLightId && getBackgroundById(savedLightId)) {
        setLightBackgroundId(savedLightId);
      }
      if (savedDarkId && getBackgroundById(savedDarkId)) {
        setDarkBackgroundId(savedDarkId);
      }
      
      const initialBackgroundId = currentTheme === 'light' 
        ? (savedLightId && getBackgroundById(savedLightId) ? savedLightId : 'default')
        : (savedDarkId && getBackgroundById(savedDarkId) ? savedDarkId : 'default');
      setLastUsedBackgroundId(initialBackgroundId);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'arriere-plan:', error);
    }
  }, []);

  const currentBackgroundId = useMemo(() => {
    if (settings.display.autoChangeBackground) {
      return currentTheme === 'light' ? lightBackgroundId : darkBackgroundId;
    }
    return lastUsedBackgroundId;
  }, [currentTheme, lightBackgroundId, darkBackgroundId, settings.display.autoChangeBackground, lastUsedBackgroundId]);

  useEffect(() => {
    if (settings.display.autoChangeBackground) {
      const themeBackgroundId = currentTheme === 'light' ? lightBackgroundId : darkBackgroundId;
      setLastUsedBackgroundId(themeBackgroundId);
    } else {
      const currentThemeBackgroundId = currentTheme === 'light' ? lightBackgroundId : darkBackgroundId;
      setLastUsedBackgroundId(prev => {
        if (!prev || prev === 'default' || prev !== currentThemeBackgroundId) {
          return currentThemeBackgroundId;
        }
        return prev;
      });
    }
  }, [settings.display.autoChangeBackground, currentTheme, lightBackgroundId, darkBackgroundId]);

  useEffect(() => {
    const background = getBackgroundById(currentBackgroundId);
    if (!background) return;

    const analysis = analyzeBackground(background.id, background.url || undefined);
    applyColorScheme(analysis.recommendedScheme);
    setCurrentColorScheme(analysis.recommendedScheme);

    document.body.className = document.body.className
      .split(' ')
      .filter(cls => !cls.startsWith(CSS_CLASS_PREFIX))
      .join(' ');

    document.body.style.removeProperty('background-image');
    document.body.style.removeProperty('background-size');
    document.body.style.removeProperty('background-position');
    document.body.style.removeProperty('background-repeat');
    document.body.style.removeProperty('background-attachment');

    if (background.type === 'default') {
      document.body.classList.add(`${CSS_CLASS_PREFIX}default`);
    } else if (background.url) {
      document.body.classList.add(`${CSS_CLASS_PREFIX}${background.id}`);
      document.body.style.backgroundImage = `url(${background.url})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
    }

    try {
      if (currentTheme === 'light') {
        localStorage.setItem(STORAGE_KEY_LIGHT, currentBackgroundId);
      } else {
        localStorage.setItem(STORAGE_KEY_DARK, currentBackgroundId);
      }
    } catch (error) {
      console.error('Error saving background:', error);
    }
  }, [currentBackgroundId, currentTheme]);

  const setBackgroundForTheme = useCallback(async (id: string, theme: 'light' | 'dark') => {
    const background = getBackgroundById(id);
    if (!background) {
      return;
    }

    setIsLoading(true);
    
    try {
      if (background.url && background.type === 'image') {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            resolve(true);
          };
          img.onerror = (error) => {
            reject(error);
          };
          img.src = background.url!;
        });
      }
      
      if (theme === 'light') {
        setLightBackgroundId(id);
        localStorage.setItem(STORAGE_KEY_LIGHT, id);
      } else {
        setDarkBackgroundId(id);
        localStorage.setItem(STORAGE_KEY_DARK, id);
      }
      
      if (settings.display.autoChangeBackground) {
        if (theme === currentTheme) {
          setLastUsedBackgroundId(id);
        }
      } else {
        if (theme === currentTheme) {
          setLastUsedBackgroundId(id);
        }
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setBackground = useCallback(async (id: string) => {
    const background = getBackgroundById(id);
    if (!background) {
      return;
    }

    const isDark = isBackgroundDark(id);
    const targetTheme = isDark ? 'dark' : 'light';
    
    await setBackgroundForTheme(id, targetTheme);
    
    if (!settings.display.autoChangeBackground) {
      setLastUsedBackgroundId(id);
    }
  }, [setBackgroundForTheme, settings.display.autoChangeBackground]);

  const currentBackground = useMemo(() => {
    return getBackgroundById(currentBackgroundId) || allBackgrounds[0];
  }, [currentBackgroundId]);

  const lightBackgrounds = useMemo(() => {
    return allBackgrounds.filter(bg => bg.id === 'default' || !isBackgroundDark(bg.id));
  }, []);

  const darkBackgrounds = useMemo(() => {
    return allBackgrounds.filter(bg => bg.id === 'default' || isBackgroundDark(bg.id));
  }, []);

  const value: GlobalBackgroundContextValue = {
    currentBackground,
    setBackground,
    setBackgroundForTheme,
    availableBackgrounds: allBackgrounds,
    lightBackgrounds,
    darkBackgrounds,
    lightBackgroundId,
    darkBackgroundId,
    isLoading,
    currentColorScheme,
  };

  return (
    <GlobalBackgroundContext.Provider value={value}>
      {children}
    </GlobalBackgroundContext.Provider>
  );
}

export function useGlobalBackground() {
  const context = useContext(GlobalBackgroundContext);
  if (!context) {
    throw new Error('useGlobalBackground must be used within a GlobalBackgroundProvider');
  }
  return context;
}

export function useCurrentBackground(): BackgroundItem {
  const { currentBackground } = useGlobalBackground();
  return currentBackground;
}
