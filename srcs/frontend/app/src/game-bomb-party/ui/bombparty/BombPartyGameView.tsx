import React from 'react';
import { useTranslation } from 'react-i18next';
import type { BombPartyHooksState } from './BombPartyHooks';
import { BottomLeftDebugSuggestions } from './BombPartyUI';

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

const SUGGESTIONS_ENABLED = true;

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

  const playersCountForLayout = state.gameState.players.length;
  const radiusBoost = Math.max(0, (playersCountForLayout - 8) * 15);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {SUGGESTIONS_ENABLED && state.gameState.phase === 'TURN_ACTIVE' && state.gameState.currentTrigram && isCurrentPlayerTurn() && (
        <BottomLeftDebugSuggestions
          title={t('bombParty.hud.wordSuggestions')}
          words={engine.getWordSuggestions(5)}
          trigramInfo={engine.getCurrentTrigramInfo()}
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
    </div>
  );
}
