import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PlayerCircle from '../PlayerCircle';
import BombTimer from '../BombTimer';
import WordInput from '../WordInput';
import Countdown from '../Countdown';
import BonusNotification from '../BonusNotification';
import Chat from '../../../Components/Chat';
import BombPartyInfoSidebar from '../../../Components/BombPartyInfoSidebar';
import PlayerProfileModal from '../../../Components/PlayerProfileModal';
import BackgroundSurface from '../../../Components/BackgroundSurface';
import SpaceBackground from '../../../Components/SpaceBackground';
import { DraggablePanel } from './BombPartyUI';
import type { BombPartyHooksState } from './BombPartyHooks';

interface BombPartyLayoutProps {
  state: BombPartyHooksState;
  engine: any;
  remainingMs: number;
  isCurrentPlayerTurn: () => boolean;
  onWordSubmit: (word: string) => void;
  onActivateBonus: (bonusKey: any) => boolean;
  onBackToMenu: () => void;
  onPlayerClick: (id: string) => void;
  onInfoToggle: () => void;
  onCloseBonusNotification: () => void;
  gameMode: 'local' | 'multiplayer';
}

export default function BombPartyLayout({
  state,
  engine,
  remainingMs,
  isCurrentPlayerTurn,
  onWordSubmit,
  onActivateBonus,
  onBackToMenu,
  onPlayerClick,
  onInfoToggle,
  onCloseBonusNotification,
  gameMode
}: BombPartyLayoutProps) {
  const { t } = useTranslation();

  const playersCountForLayout = state.gameState.players.length;
  const radiusBoost = Math.max(0, (playersCountForLayout - 8) * 15);

  return (
    <BackgroundSurface game="bombparty">
      <SpaceBackground />
      <div className="min-h-screen relative overflow-hidden">
        <Countdown count={state.countdown} isActive={state.gamePhase === 'GAME' && state.countdown > 0} />

        <div className="relative w-full h-screen">
          <PlayerCircle
            players={state.gameState.players}
            currentPlayerIndex={state.gameState.currentPlayerIndex}
            radiusBoost={radiusBoost}
            pendingFastForNextPlayerId={state.gameState.pendingFastForNextPlayerId}
            onPlayerClick={onPlayerClick}
          />

          <BombTimer
            syllable={state.gameState.currentSyllable}
            remainingMs={remainingMs}
            isActive={state.gameState.phase === 'TURN_ACTIVE'}
            usageCount={state.gameState.usedWords?.length || 0}
            totalPlayers={state.gameState.players.length}
            flashExtend={state.timerFlash}
            currentPlayerName={state.gameState.players[state.gameState.currentPlayerIndex]?.name}
          />

          <DraggablePanel initialOffset={{ x: 0, y: -120 }}>
            <WordInput
              syllable={state.gameState.currentSyllable}
              usedWords={state.gameState.usedWords || []}
              onSubmit={onWordSubmit}
              isActive={state.gameState.phase === 'TURN_ACTIVE' && !!isCurrentPlayerTurn()}
              engine={engine}
              bonuses={state.gameState.players[state.gameState.currentPlayerIndex]?.bonuses}
              onActivateBonus={onActivateBonus}
              hasDoubleChance={Boolean(state.gameState.players[state.gameState.currentPlayerIndex]?.pendingEffects?.doubleChance)}
            />
          </DraggablePanel>

          <div className="absolute top-6 left-6">
            <button
              onClick={onBackToMenu}
              className="px-4 py-2 bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-all duration-200"
            >
              {t('bombParty.backToMenu')}
            </button>
          </div>

          {gameMode === 'multiplayer' && <Chat />}

          <div className="absolute top-6 right-6 z-40">
            <button
              onClick={onInfoToggle}
              className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-300 hover:text-white hover:border-slate-500"
              aria-label={t('bombParty.info.openAria')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          <PlayerProfileModal
            playerId={state.profilePlayerId}
            open={Boolean(state.profilePlayerId)}
            onClose={() => onPlayerClick('')}
          />

          <BombPartyInfoSidebar open={state.infoOpen} onClose={onInfoToggle} />
          
          {/* Notification de bonus */}
          {state.bonusNotification && (
            <BonusNotification
              bonusKey={state.bonusNotification.bonusKey}
              playerName={state.bonusNotification.playerName}
              onClose={onCloseBonusNotification}
            />
          )}
        </div>
      </div>
    </BackgroundSurface>
  );
}
