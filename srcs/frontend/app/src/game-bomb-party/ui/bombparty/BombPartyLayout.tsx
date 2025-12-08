import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import PlayerCircle from '../PlayerCircle';
import BombTimer from '../BombTimer';
import WordInput from '../WordInput';
import Countdown from '../Countdown';
import BonusNotification from '../BonusNotification';
import BombPartyInfoSidebar from '../../../Components/BombPartyInfoSidebar';
import PlayerProfileModal from '../../../Components/PlayerProfileModal';
import BackgroundSurface from '../../../Components/BackgroundSurface';
import SpaceBackground from '../../../Components/SpaceBackground';
import { DraggablePanel } from './UIComponents';
import type { BombPartyHooksState } from './BombPartyHooks';
import { TurnTransitionAnimation, BonusFlashAnimation, AnimationStyles } from '../Animations';
import { useSoundEffects } from '../useSoundEffects';
import { useSettings } from '../../../contexts/SettingsContext';
import SpectatorView from '../SpectatorView';
import type { Player } from '../../../types/bombparty';

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
  const { playSound } = useSoundEffects();
  const { settings } = useSettings();
  const previousPlayerIndexRef = useRef<number>(state.gameState.currentPlayerIndex);
  const previousBonusNotificationRef = useRef<typeof state.bonusNotification>(null);
  const [turnTransitionTrigger, setTurnTransitionTrigger] = useState<number | null>(null);
  const [bonusFlashTrigger, setBonusFlashTrigger] = useState<{ timestamp: number; icon: string; name: string } | null>(null);

  const currentPlayer = state.gameState.players.find((p: Player) => p.id === state.playerId);
  const isCurrentPlayerEliminated = currentPlayer?.isEliminated ?? false;

  const activePlayers = state.gameState.players.filter((p: Player) => !p.isEliminated);
  const eliminatedPlayers = state.gameState.players.filter((p: Player) => p.isEliminated);

  const currentPlayerInGame = state.gameState.players[state.gameState.currentPlayerIndex];
  const currentPlayerIndexInActive = activePlayers.findIndex((p: Player) => 
    p.id === currentPlayerInGame?.id && !p.isEliminated
  );

  const playersCountForLayout = activePlayers.length;
  const radiusBoost = Math.max(0, (playersCountForLayout - 8) * 15);

  useEffect(() => {
    if (previousPlayerIndexRef.current !== state.gameState.currentPlayerIndex && state.gamePhase === 'GAME') {
      const currentPlayerInGame = state.gameState.players[state.gameState.currentPlayerIndex];
      if (currentPlayerInGame) {
        setTurnTransitionTrigger(Date.now());
        playSound('turnTransition');
      }
      previousPlayerIndexRef.current = state.gameState.currentPlayerIndex;
    }
  }, [state.gameState.currentPlayerIndex, state.gamePhase, playSound]);

  useEffect(() => {
    if (state.bonusNotification && state.bonusNotification !== previousBonusNotificationRef.current) {
      const bonusIcons: Record<string, string> = {
        inversion: '🔁',
        plus5sec: '➕',
        vitesseEclair: '⚡',
        doubleChance: '♢',
        extraLife: '❤️',
      };
      const bonusNames: Record<string, string> = {
        inversion: t('bombParty.bonus.inversion.name'),
        plus5sec: t('bombParty.bonus.plus5sec.name'),
        vitesseEclair: t('bombParty.bonus.vitesseEclair.name'),
        doubleChance: t('bombParty.bonus.doubleChance.name'),
        extraLife: t('bombParty.bonus.extraLife.name'),
      };
      setBonusFlashTrigger({
        timestamp: Date.now(),
        icon: bonusIcons[state.bonusNotification.bonusKey] || '✨',
        name: bonusNames[state.bonusNotification.bonusKey] || state.bonusNotification.bonusKey,
      });
      playSound('bonus');
      previousBonusNotificationRef.current = state.bonusNotification;
    }
  }, [state.bonusNotification, t, playSound]);

  const animationsDisabled = settings.game?.preferences?.reducedMotion || !settings.display.animations;

  if (state.gameState.phase === 'GAME_OVER' || (isCurrentPlayerEliminated && gameMode === 'multiplayer')) {
    return (
      <BackgroundSurface game="bombparty">
        <SpaceBackground />
        <SpectatorView
          gameState={state.gameState}
          currentPlayerId={state.playerId}
          onQuit={onBackToMenu}
        />
      </BackgroundSurface>
    );
  }

  return (
    <BackgroundSurface game="bombparty">
      <AnimationStyles />
      <SpaceBackground />
      <TurnTransitionAnimation 
        trigger={turnTransitionTrigger} 
        disabled={animationsDisabled}
        playerName={currentPlayerInGame?.name}
      />
      <BonusFlashAnimation 
        trigger={bonusFlashTrigger?.timestamp} 
        disabled={animationsDisabled}
        bonusIcon={bonusFlashTrigger?.icon}
        bonusName={bonusFlashTrigger?.name}
      />
      <div className="min-h-screen relative overflow-hidden">
        <Countdown count={state.countdown} isActive={state.countdown > 0} />

        <div className="relative w-full h-screen">
          <PlayerCircle
            players={activePlayers}
            currentPlayerIndex={currentPlayerIndexInActive >= 0 ? currentPlayerIndexInActive : 0}
            radiusBoost={radiusBoost}
            pendingFastForNextPlayerId={state.gameState.pendingFastForNextPlayerId}
            onPlayerClick={onPlayerClick}
          />
          
          {eliminatedPlayers.length > 0 && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-lg p-3 max-w-md">
              <div className="text-xs text-slate-400 mb-2 text-center">
                {t('bombParty.spectator.eliminatedPlayers', 'Joueurs elimines')}
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {eliminatedPlayers.map((player: Player) => (
                  <div
                    key={player.id}
                    className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded text-sm text-red-300"
                  >
                    {player.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <BombTimer
            syllable={state.gameState.currentSyllable}
            remainingMs={remainingMs}
            isActive={state.gameState.phase === 'TURN_ACTIVE'}
            usageCount={state.gameState.usedWords?.length || 0}
            totalPlayers={state.gameState.players.length}
            flashExtend={state.timerFlash}
            currentPlayerName={state.gameState.players[state.gameState.currentPlayerIndex]?.name}
            difficulty={state.gameState.currentSyllableDifficulty}
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
