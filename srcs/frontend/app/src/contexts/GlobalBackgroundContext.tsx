import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { backgroundCatalog, getBackgroundById, type BackgroundItem } from '../backgrounds/catalog';
import { analyzeBackground, applyColorScheme, type ColorScheme } from '../utils/colorAdaptation';

interface GlobalBackgroundContextValue {
  currentBackground: BackgroundItem;
  setBackground: (id: string) => void;
  availableBackgrounds: BackgroundItem[];
  isLoading: boolean;
  currentColorScheme: ColorScheme | null;
}

const GlobalBackgroundContext = createContext<GlobalBackgroundContextValue | undefined>(undefined);

const STORAGE_KEY = 'ui.background.global';
const CSS_CLASS_PREFIX = 'bg-active-';

export function GlobalBackgroundProvider({ children }: { children: ReactNode }) {
  const [currentBackgroundId, setCurrentBackgroundId] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [currentColorScheme, setCurrentColorScheme] = useState<ColorScheme | null>(null);

  useEffect(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId && getBackgroundById(savedId)) {
        setCurrentBackgroundId(savedId);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'arrière-plan:', error);
    }
  }, []);

  useEffect(() => {
    const background = getBackgroundById(currentBackgroundId);
    if (!background) return;

    console.log('[Background] Application:', {
      id: background.id,
      name: background.name,
      type: background.type
    });

    const analysis = analyzeBackground(background.id, background.url || undefined);
    console.log('🎨 [Color] Analyse du fond:', analysis);
    
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
      localStorage.setItem(STORAGE_KEY, currentBackgroundId);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'arrière-plan:', error);
    }
  }, [currentBackgroundId]);

  const setBackground = useCallback(async (id: string) => {
    console.log('[Background] setBackground appelé avec ID:', id);
    const background = getBackgroundById(id);
    if (!background) {
      console.warn('[Background] ID non trouvé:', id);
      console.log('[Background] Catalog disponible:', backgroundCatalog.map(bg => bg.id));
      return;
    }

      console.log('[Background] Background trouvé:', background);
    setIsLoading(true);
    
    try {
      if (background.url && background.type === 'image') {
        console.log('[Background] Préchargement de l\'image:', background.url);
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            console.log('[Background] Image préchargée avec succès');
            resolve(true);
          };
          img.onerror = (error) => {
            console.error('[Background] Erreur de préchargement:', error);
            reject(error);
          };
          img.src = background.url!;
        });
      }
      
      console.log('[Background] Mise à jour de currentBackgroundId vers:', id);
      setCurrentBackgroundId(id);
    } catch (error) {
      console.error('[Background] Erreur lors du chargement:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const currentBackground = useMemo(() => {
    return getBackgroundById(currentBackgroundId) || backgroundCatalog[0];
  }, [currentBackgroundId]);

  const value: GlobalBackgroundContextValue = {
    currentBackground,
    setBackground,
    availableBackgrounds: backgroundCatalog,
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
