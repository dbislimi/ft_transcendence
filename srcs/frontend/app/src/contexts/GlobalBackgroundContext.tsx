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
  const [lastUsedBackgroundId, setLastUsedBackgroundId] = useState<string>('default'); // Background utilisé quand autoChangeBackground est désactivé
  const [isLoading, setIsLoading] = useState(false);
  const [currentColorScheme, setCurrentColorScheme] = useState<ColorScheme | null>(null);

  // Charger les backgrounds sauvegardés
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
      
      // Initialiser le dernier background utilisé selon le thème actuel
      const initialBackgroundId = currentTheme === 'light' 
        ? (savedLightId && getBackgroundById(savedLightId) ? savedLightId : 'default')
        : (savedDarkId && getBackgroundById(savedDarkId) ? savedDarkId : 'default');
      setLastUsedBackgroundId(initialBackgroundId);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'arrière-plan:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // On charge une seule fois au démarrage

  // Déterminer le background actuel selon le thème et le paramètre autoChangeBackground
  const currentBackgroundId = useMemo(() => {
    // Si autoChangeBackground est activé, changer selon le thème
    if (settings.display.autoChangeBackground) {
      return currentTheme === 'light' ? lightBackgroundId : darkBackgroundId;
    }
    // Sinon, garder le même background même si on change de thème
    return lastUsedBackgroundId;
  }, [currentTheme, lightBackgroundId, darkBackgroundId, settings.display.autoChangeBackground, lastUsedBackgroundId]);

  // Mettre à jour le dernier background utilisé quand autoChangeBackground est activé
  useEffect(() => {
    if (settings.display.autoChangeBackground) {
      const themeBackgroundId = currentTheme === 'light' ? lightBackgroundId : darkBackgroundId;
      setLastUsedBackgroundId(themeBackgroundId);
    } else {
      // Quand on désactive autoChangeBackground, capturer le background actuel une seule fois
      // pour qu'il reste fixe même si on change les backgrounds d'autres modes
      const currentThemeBackgroundId = currentTheme === 'light' ? lightBackgroundId : darkBackgroundId;
      // Ne mettre à jour que si lastUsedBackgroundId n'est pas encore défini ou si c'est le premier chargement
      // ou si le thème actuel change (pour capturer le nouveau background du nouveau thème)
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

    console.log('[Background] Application:', {
      id: background.id,
      name: background.name,
      type: background.type
    });

    const analysis = analyzeBackground(background.id, background.url || undefined);
    console.log('[Color] Background analysis:', analysis);
    
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
      // Sauvegarder selon le thème actuel
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
    console.log('[Background] setBackgroundForTheme called with ID:', id, 'Theme:', theme);
    const background = getBackgroundById(id);
    if (!background) {
      console.warn('[Background] ID not found:', id);
      return;
    }

    setIsLoading(true);
    
    try {
      if (background.url && background.type === 'image') {
        console.log('[Background] Preloading image:', background.url);
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            console.log('[Background] Image preloaded successfully');
            resolve(true);
          };
          img.onerror = (error) => {
            console.error('[Background] Preload error:', error);
            reject(error);
          };
          img.src = background.url!;
        });
      }
      
      console.log('[Background] Updating background for theme:', theme, 'to:', id);
      if (theme === 'light') {
        setLightBackgroundId(id);
        localStorage.setItem(STORAGE_KEY_LIGHT, id);
      } else {
        setDarkBackgroundId(id);
        localStorage.setItem(STORAGE_KEY_DARK, id);
      }
      
      // Mettre à jour lastUsedBackgroundId seulement si :
      // 1. autoChangeBackground est activé ET c'est le thème actuel
      // 2. OU autoChangeBackground est désactivé ET c'est le thème actuel (pour garder le background actuel)
      if (settings.display.autoChangeBackground) {
        // Si autoChangeBackground est activé, mettre à jour seulement si c'est le thème actuel
        if (theme === currentTheme) {
          setLastUsedBackgroundId(id);
        }
      } else {
        // Si autoChangeBackground est désactivé, mettre à jour seulement si c'est le thème actuel
        // Cela garantit que changer le background d'un autre mode ne change pas le background actuel
        if (theme === currentTheme) {
          setLastUsedBackgroundId(id);
        }
      }
    } catch (error) {
      console.error('[Background] Error loading:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setBackground = useCallback(async (id: string) => {
    // Déterminer pour quel thème définir le background
    const background = getBackgroundById(id);
    if (!background) {
      console.warn('[Background] ID not found:', id);
      return;
    }

    const isDark = isBackgroundDark(id);
    const targetTheme = isDark ? 'dark' : 'light';
    
    await setBackgroundForTheme(id, targetTheme);
    
    // Mettre à jour le dernier background utilisé si autoChangeBackground est désactivé
    if (!settings.display.autoChangeBackground) {
      setLastUsedBackgroundId(id);
    }
  }, [setBackgroundForTheme, settings.display.autoChangeBackground]);

  const currentBackground = useMemo(() => {
    return getBackgroundById(currentBackgroundId) || allBackgrounds[0];
  }, [currentBackgroundId]);

  // Séparer les backgrounds en clairs et sombres
  const lightBackgrounds = useMemo(() => {
    // Inclure "default" dans les deux listes
    return allBackgrounds.filter(bg => bg.id === 'default' || !isBackgroundDark(bg.id));
  }, []);

  const darkBackgrounds = useMemo(() => {
    // Inclure "default" dans les deux listes
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
