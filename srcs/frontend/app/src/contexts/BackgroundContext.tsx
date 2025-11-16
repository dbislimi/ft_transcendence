import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import bg42 from '../../img/42background.svg?url';
import bghalloween from '../../img/hallowenn_background.svg?url';
import bgmatrix42 from '../../img/matrix_42_background.svg?url';
import bgsnow from '../../img/snow_background.svg?url';

export type BackgroundKey = 'default' | 'space' | '42' | 'halloween' | 'matrix42' | 'snow';
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

const BACKGROUND_URLS: Partial<Record<Exclude<BackgroundKey, 'default'>, string>> = {
  '42': bg42,
  'halloween': bghalloween,
  'matrix42': bgmatrix42,
  'snow': bgsnow,
};

function loadState(): BackgroundState {
  try {
    const global = (localStorage.getItem(STORAGE_KEYS.global) as BackgroundKey) || 'default';
    const bombparty = (localStorage.getItem(STORAGE_KEYS.bombparty) as BackgroundKey) || 'default';
    const pong = (localStorage.getItem(STORAGE_KEYS.pong) as BackgroundKey) || 'default';
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
    return BACKGROUND_URLS[key] ?? null;
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