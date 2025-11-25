import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { allBackgrounds, getBackgroundById, getBackgroundUrl as getCatalogBackgroundUrl, type BackgroundItem } from '../backgrounds/catalog';

export type BackgroundKey = string;
export type GameKey = 'bombparty' | 'pong';

type BackgroundState = {
  global: BackgroundKey;
  bombparty: BackgroundKey;
  pong: BackgroundKey;
};

type BackgroundContextValue = {
  state: BackgroundState;
  getBackgroundFor: (game: GameKey) => BackgroundKey;
  setBackgroundFor: (game: GameKey, key: BackgroundKey) => void;
  setGlobalBackground: (key: BackgroundKey) => void;
  clearBackground: (game: GameKey) => void;
  getBackgroundUrl: (key: BackgroundKey) => string | null;
  getGlobalBackgroundKey: () => BackgroundKey;
  availableBackgrounds: BackgroundItem[];
};

const STORAGE_KEYS = {
  global: 'ui.background.global',
  bombparty: 'ui.background.bombparty',
  pong: 'ui.background.pong',
} as const;

const BackgroundContext = createContext<BackgroundContextValue | undefined>(undefined);

const DEFAULT_STATE: BackgroundState = {
  global: 'default',
  bombparty: 'default',
  pong: 'default',
};

function loadState(): BackgroundState {
  try {
    const savedGlobal = localStorage.getItem(STORAGE_KEYS.global);
    const savedBombparty = localStorage.getItem(STORAGE_KEYS.bombparty);
    const savedPong = localStorage.getItem(STORAGE_KEYS.pong);
    const global = (savedGlobal && getBackgroundById(savedGlobal)) ? savedGlobal : 'default';
    const bombparty = (savedBombparty && getBackgroundById(savedBombparty)) ? savedBombparty : 'default';
    const pong = (savedPong && getBackgroundById(savedPong)) ? savedPong : 'default';
    
    return { global, bombparty, pong };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function persistState(partial: Partial<BackgroundState>) {
  try {
    if (partial.global) localStorage.setItem(STORAGE_KEYS.global, partial.global);
    if (partial.bombparty) localStorage.setItem(STORAGE_KEYS.bombparty, partial.bombparty);
    if (partial.pong) localStorage.setItem(STORAGE_KEYS.pong, partial.pong);
  } catch {
  }
}

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BackgroundState>(() => loadState());

  useEffect(() => {
    persistState(state);
  }, []);

  const getBackgroundFor = useCallback((game: GameKey): BackgroundKey => {
    const specific = state[game];
    return specific !== 'default' ? specific : state.global;
  }, [state]);

  const setBackgroundFor = useCallback((game: GameKey, key: BackgroundKey) => {
    setState(prev => {
      const next = { ...prev, [game]: key } as BackgroundState;
      persistState({ [game]: key } as Partial<BackgroundState>);
      return next;
    });
  }, []);

  const setGlobalBackground = useCallback((key: BackgroundKey) => {
    setState(prev => {
      const next = { ...prev, global: key };
      persistState({ global: key });
      return next;
    });
  }, []);

  const clearBackground = useCallback((game: GameKey) => {
    setBackgroundFor(game, 'default');
  }, [setBackgroundFor]);

  const getBackgroundUrl = useCallback((key: BackgroundKey): string | null => {
    if (key === 'default' || key === 'space') return null;
    return getCatalogBackgroundUrl(key);
  }, []);

  const getGlobalBackgroundKey = useCallback(() => state.global, [state.global]);

  const value = useMemo<BackgroundContextValue>(() => ({
    state,
    getBackgroundFor,
    setBackgroundFor,
    setGlobalBackground,
    clearBackground,
    getBackgroundUrl,
    getGlobalBackgroundKey,
    availableBackgrounds: allBackgrounds,
  }), [state, getBackgroundFor, setBackgroundFor, setGlobalBackground, clearBackground, getBackgroundUrl, getGlobalBackgroundKey]);

  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const ctx = useContext(BackgroundContext);
  if (!ctx) throw new Error('useBackground must be used within BackgroundProvider');
  return ctx;
}