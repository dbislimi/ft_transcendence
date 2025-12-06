import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BombPartyHooksState } from './BombPartyHooks';
import { BottomLeftDebugSuggestions } from './UIComponents';
import { useBombPartyStore } from '../../../store/useBombPartyStore';
import SettingsModal from '../SettingsModal';

interface BombPartyGameViewProps {
  state: BombPartyHooksState;
  engine: any;
  remainingMs: number;
  isCurrentPlayerTurn: () => boolean;
  onWordSubmit: (word: string) => void;
  onActivateBonus: (bonusKey: any) => boolean;
  onBackToMenu: () => void;
  onPlayerClick: (id: string) => void;
  onInfoToggle: () => void;
  gameMode: 'local' | 'multiplayer';
}

function getSyllableDifficulty(availableWords: number): 'easy' | 'medium' | 'hard' {
  if (availableWords >= 100) {
    return 'easy';
  } else if (availableWords >= 50) {
    return 'medium';
  } else {
    return 'hard';
  }
}

export default function BombPartyGameView({
  state,
  engine,
  remainingMs,
  isCurrentPlayerTurn,
  onWordSubmit,
  onActivateBonus,
  onBackToMenu,
  onPlayerClick,
  onInfoToggle,
  gameMode
}: BombPartyGameViewProps) {
  const { t } = useTranslation();
  const { userPreferences } = useBombPartyStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const playersCountForLayout = state.gameState.players.length;
  const radiusBoost = Math.max(0, (playersCountForLayout - 8) * 15);

  const filteredSuggestions = useMemo(() => {
    if (!userPreferences.suggestionsEnabled || userPreferences.suggestionsCount === 0) {
      return [];
    }

    if (state.gameState.phase !== 'TURN_ACTIVE' || !state.gameState.currentSyllable || !isCurrentPlayerTurn()) {
      return [];
    }

    const syllableInfo = engine.getCurrentSyllableInfo();
    const allSuggestions = engine.getWordSuggestions(10);

    if (userPreferences.suggestionsDifficulty !== 'all' && syllableInfo) {
      const syllableDifficulty = getSyllableDifficulty(syllableInfo.availableWords);
      
      if (syllableDifficulty !== userPreferences.suggestionsDifficulty) {
        return [];
      }
    }

    return allSuggestions.slice(0, userPreferences.suggestionsCount);
  }, [
    userPreferences.suggestionsEnabled,
    userPreferences.suggestionsCount,
    userPreferences.suggestionsDifficulty,
    state.gameState.phase,
    state.gameState.currentSyllable,
    state.gameState.currentPlayerId,
    engine
  ]);

  const syllableInfo = useMemo(() => {
    if (state.gameState.phase === 'TURN_ACTIVE' && state.gameState.currentSyllable) {
      return engine.getCurrentSyllableInfo();
    }
    return null;
  }, [state.gameState.phase, state.gameState.currentSyllable, engine]);

  const shouldShowSuggestions = 
    userPreferences.suggestionsEnabled &&
    userPreferences.suggestionsCount > 0 &&
    state.gameState.phase === 'TURN_ACTIVE' &&
    state.gameState.currentSyllable &&
    isCurrentPlayerTurn() &&
    filteredSuggestions.length > 0;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {shouldShowSuggestions && (
        <BottomLeftDebugSuggestions
          title={t('bombParty.hud.wordSuggestions')}
          words={filteredSuggestions}
          syllableInfo={syllableInfo}
        />
      )}

      <div className="relative w-full h-screen">
        <div className="absolute top-6 left-6 flex gap-2">
          <button
            onClick={onBackToMenu}
            className="px-4 py-2 bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-all duration-200"
          >
            {t('bombParty.backToMenu')}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-4 py-2 bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-all duration-200"
            aria-label={t('bombParty.settings.open', 'Ouvrir les parametres')}
          >
            ⚙️
          </button>
        </div>

        {gameMode === 'multiplayer' && (
          <div className="absolute top-6 right-6 z-40">
            <button
              onClick={onInfoToggle}
              className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-300 hover:text-white hover:border-slate-500"
              aria-label={t('bombParty.info.openAria')}
            >
              ℹ️
            </button>
          </div>
        )}
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
