import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BombPartyEngine } from '../core/engine';
import { TurnTimer, useTurnTimer } from '../core/timer';
import type { GameConfig, BonusKey } from '../core/types';
import { debugDictionary } from '../data/validator';
import Menu from './Menu';
import PlayerCircle from './PlayerCircle';
import BombTimer from './BombTimer';
import WordInput from './WordInput';
import Countdown from './Countdown';
import RulesScreen from '../RulesScreen';
import LobbyScreen from './LobbyScreen';
import Chat from '../../Components/Chat';
import BombPartyInfoSidebar from '../../Components/BombPartyInfoSidebar';
import PlayerProfileModal from '../../Components/PlayerProfileModal';
import BackgroundSurface from '../../Components/BackgroundSurface';
import SpaceBackground from '../../Components/SpaceBackground';

// Flag pour activer/désactiver les suggestions
const SUGGESTIONS_ENABLED = true;

export default function BombPartyPage() {
  const { t } = useTranslation();
  const [gamePhase, setGamePhase] = useState<'RULES' | 'LOBBY' | 'PLAYERS' | 'GAME'>('RULES');
  const [engine] = useState(() => new BombPartyEngine());
  const [timer] = useState(() => new TurnTimer());
  const [countdown, setCountdown] = useState(3);
  const [gameState, setGameState] = useState(engine.getState());
  const [wordJustSubmitted, setWordJustSubmitted] = useState(false);
  const [turnInProgress, setTurnInProgress] = useState(false);
  const [timerGracePeriod, setTimerGracePeriod] = useState(false);
  const [turnStartTime, setTurnStartTime] = useState(0);
  const [timerFlash, setTimerFlash] = useState(false);
  const [profilePlayerId, setProfilePlayerId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const remainingMs = useTurnTimer(timer, gameState.phase === 'TURN_ACTIVE');

  const handleRulesContinue = useCallback(() => setGamePhase('LOBBY'), []);

  const handleLobbyCreate = useCallback((meta: { name: string; isPrivate: boolean; password?: string; }) => {
    void meta; // silence unused for now
    setGamePhase('PLAYERS');
  }, []);

  const handleLobbyJoin = useCallback((name: string, password?: string) => {
    void name; // silence unused for now
    void password; // silence unused for now
    setGamePhase('PLAYERS');
  }, []);

  const handleBackFromLobby = useCallback(() => setGamePhase('RULES'), []);

  const startGame = useCallback((config: GameConfig) => {
    console.log('🎮 Démarrage du jeu avec config:', config);
    debugDictionary();

    engine.startGame(config);
    setGameState(engine.getState());
    setGamePhase('GAME');

    // Démarrer le compte à rebours
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          console.log('🚀 Démarrage du premier tour');
          engine.startCountdown();
          engine.startTurn();
          timer.startTurn(engine.getTurnDurationForCurrentPlayer());
          setGameState(engine.getState());

          setTurnStartTime(performance.now());
          setTimerGracePeriod(true);
          setTimeout(() => {
            setTimerGracePeriod(false);
            console.log('⏱️ Délai de grâce terminé - timeout autorisé');
          }, 5000);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [engine, timer]);

  const handleWordSubmit = useCallback((word: string) => {
    console.log('🎯 Soumission du mot:', word);

    setWordJustSubmitted(true);
    setTurnInProgress(true);

    const res = engine.submitWord(word, 0);
    setGameState(engine.getState());

    if (!res.ok && res.consumedDoubleChance) {
      // Keep the same turn active; allow another attempt
      setWordJustSubmitted(false);
      setTurnInProgress(false);
      return;
    }

    timer.stop();

    setTimeout(() => {
      const timeExpired = false;
      engine.resolveTurn(res.ok, timeExpired);
      setGameState(engine.getState());

      if (!engine.isGameOver()) {
        setTimeout(() => {
          engine.startTurn();
          timer.startTurn(engine.getTurnDurationForCurrentPlayer());
          setGameState(engine.getState());

          setTurnStartTime(performance.now());
          setTimerGracePeriod(true);
          setTimeout(() => {
            setTimerGracePeriod(false);
          }, 5000);

          setWordJustSubmitted(false);
          setTurnInProgress(false);
        }, 1000);
      }
    }, 1500);
  }, [engine, timer]);

  const handleActivateBonus = useCallback((bonusKey: BonusKey) => {
    const current = engine.getCurrentPlayer();
    if (!current) return false;
    const res = engine.activateBonus(current.id, bonusKey);
    if (res.ok) {
      if (bonusKey === 'plus5sec' && res.meta?.extendMs) {
        timer.extend(res.meta.extendMs);
        setTimerFlash(true);
        setTimeout(() => setTimerFlash(false), 500);
      }
      setGameState(engine.getState());
      return true;
    }
    return false;
  }, [engine, timer]);

  const handleBackToMenu = useCallback(() => {
    engine.reset();
    timer.stop();
    setGameState(engine.getState());
    setGamePhase('RULES');
    setCountdown(3);
  }, [engine, timer]);

  useEffect(() => {
    const timeSinceTurnStart = performance.now() - turnStartTime;
    if (gameState.phase === 'TURN_ACTIVE' && remainingMs <= 0 && !wordJustSubmitted && !turnInProgress && !timerGracePeriod && timer.isTimerActive() && timeSinceTurnStart > 2000) {
      const wordValid = false;
      const timeExpired = true;
      engine.resolveTurn(wordValid, timeExpired);
      timer.stop();
      setGameState(engine.getState());

      if (!engine.isGameOver()) {
        setTimeout(() => {
          engine.startTurn();
          timer.startTurn(30000);
          setGameState(engine.getState());
          setTurnInProgress(false);
        }, 1000);
      }
    }
  }, [remainingMs, gameState.phase, engine, timer, wordJustSubmitted, turnInProgress, timerGracePeriod, turnStartTime]);

  if (gamePhase === 'RULES') {
    return <RulesScreen onContinue={handleRulesContinue} />;
  }
  if (gamePhase === 'LOBBY') {
    return <LobbyScreen onCreate={handleLobbyCreate} onJoin={handleLobbyJoin} onBack={handleBackFromLobby} />;
  }
  if (gamePhase === 'PLAYERS') {
    return (
      <BackgroundSurface game="bombparty">
        <SpaceBackground />
        <Menu onStart={startGame} />
      </BackgroundSurface>
    );
  }

  // Lorsque 12 joueurs sont présents, on augmente l’espacement via PlayerCircle (voir prop radiusBoost plus bas).
  const playersCountForLayout = gameState.players.length;
  const radiusBoost = Math.max(0, (playersCountForLayout - 8) * 15); // +60px à 12 joueurs

  return (
    <BackgroundSurface game="bombparty">
    <SpaceBackground />
    <div className="min-h-screen relative overflow-hidden">
      {/* Compte à rebours */}
      <Countdown count={countdown} isActive={gamePhase === 'GAME' && countdown > 0} />

      {/* Écran de fin de partie */}
      {gameState.phase === 'GAME_OVER' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
          <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-md text-center">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
              {t('bombParty.gameOver.title')}
            </h2>
            {engine.getWinner() && (
              <p className="text-slate-300 text-xl mb-6">
                {t('bombParty.gameOver.winner', { name: engine.getWinner()?.name })}
              </p>
            )}
            <button
              onClick={handleBackToMenu}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all duration-200"
            >
              {t('bombParty.gameOver.backToMenu')}
            </button>
          </div>
        </div>
      )}

      {/* Interface principale du jeu */}
      <div className="relative w-full h-screen">
        {/* Retiré: anciennes overlays centrées */}

        {/* Bloc debug suggestions en bas à gauche (toggle) */}
        {SUGGESTIONS_ENABLED && gameState.phase === 'TURN_ACTIVE' && gameState.currentTrigram && (
          <BottomLeftDebugSuggestions
            title={t('bombParty.hud.wordSuggestions')}
            words={engine.getWordSuggestions(5)}
            trigramInfo={engine.getCurrentTrigramInfo()}
          />
        )}

        {/* Cercle des joueurs (espacement augmenté si beaucoup de joueurs) */}
        <PlayerCircle
          players={gameState.players}
          currentPlayerIndex={gameState.currentPlayerIndex}
          radiusBoost={radiusBoost}
          pendingFastForNextPlayerId={gameState.pendingFastForNextPlayerId}
          onPlayerClick={(id) => setProfilePlayerId(id)}
        />

        {/* Bombe, timer et trigramme au centre */}
        <BombTimer
          trigram={gameState.currentTrigram}
          remainingMs={remainingMs}
          isActive={gameState.phase === 'TURN_ACTIVE'}
          usageCount={engine.getCurrentTrigramUsageCount()}
          totalPlayers={engine.getTotalPlayersInRound()}
          flashExtend={timerFlash}
          currentPlayerName={engine.getCurrentPlayer()?.name}
        />

        {/* Saisie du mot — panneau déplaçable (fixed + contraintes viewport) */}
        <DraggablePanel initialOffset={{ x: 0, y: -120 }}>
          <WordInput
            trigram={gameState.currentTrigram}
            usedWords={gameState.usedWords}
            onSubmit={handleWordSubmit}
            isActive={gameState.phase === 'TURN_ACTIVE'}
            engine={engine}
            bonuses={engine.getCurrentPlayer()?.bonuses}
            onActivateBonus={handleActivateBonus}
            hasDoubleChance={Boolean(engine.getCurrentPlayer()?.pendingEffects?.doubleChance)}
          />
        </DraggablePanel>

        {/* Bouton retour au menu */}
        <button
          onClick={handleBackToMenu}
          className="absolute top-6 left-6 px-4 py-2 bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-all duration-200"
        >
          {t('bombParty.backToMenu')}
        </button>

        {/* Chat - même style/placement que Pong */}
        <Chat />

        {/* Information overlay button */}
        <div className="absolute top-6 right-6 z-40">
          <button
            onClick={() => setInfoOpen(true)}
            className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/80 text-slate-300 hover:text-white hover:border-slate-500"
            aria-label={t('bombParty.info.openAria')}
          >
            ℹ️
          </button>
        </div>

        {/* Player profile modal */}
        <PlayerProfileModal
          playerId={profilePlayerId}
          open={Boolean(profilePlayerId)}
          onClose={() => setProfilePlayerId(null)}
        />

        {/* Info sidebar */}
        <BombPartyInfoSidebar open={infoOpen} onClose={() => setInfoOpen(false)} />
      </div>
    </div>
    </BackgroundSurface>
  );
}

/* --------- Composants internes --------- */

function BottomLeftDebugSuggestions({
  title,
  words,
  trigramInfo,
}: {
  title: string;
  words: string[];
  trigramInfo: { availableWords: number; totalWords: number } | null;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-30">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1 text-xs rounded bg-slate-800/80 border border-slate-600 text-slate-300 hover:text-white"
      >
        {open ? t('bombParty.debug.hide') : t('bombParty.debug.show')}
      </button>
      {open && (
        <div className="mt-2 bg-slate-800/90 backdrop-blur-md rounded-xl border border-purple-500/30 p-3 max-w-xs">
          <div className="text-xs text-slate-400 mb-2">
            {title}
            {trigramInfo && (
              <span className="ml-2 text-[10px] text-slate-500">
                {trigramInfo.availableWords}/{trigramInfo.totalWords}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {words.map((word, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-purple-600/30 text-purple-200 text-[10px] rounded-md border border-purple-500/30"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Panneau déplaçable pour WordInput.
   initialOffset: décalage vertical par rapport au bas-centre (y négatif = remonter). */
function DraggablePanel({
  children,
  initialOffset = { x: 0, y: 0 },
}: {
  children: React.ReactNode;
  initialOffset?: { x: number; y: number };
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 24, y: window.innerHeight - 200 });
  const [dragging, setDragging] = React.useState(false);
  const startRef = React.useRef<{ mx: number; my: number; x: number; y: number } | null>(null);

  React.useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const next = { x: Math.round(w / 2) + initialOffset.x, y: Math.round(h / 2) + initialOffset.y };
    setPos({ x: clamp(next.x, 16, w - 320), y: clamp(next.y, 16, h - 120) });
  }, [initialOffset.x, initialOffset.y]);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging || !startRef.current) return;
      const dx = e.clientX - startRef.current.mx;
      const dy = e.clientY - startRef.current.my;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cardW = cardRef.current?.offsetWidth ?? 320;
      const cardH = cardRef.current?.offsetHeight ?? 160;
      const nx = clamp(startRef.current.x + dx, 8, w - cardW - 8);
      const ny = clamp(startRef.current.y + dy, 8, h - cardH - 8);
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      setDragging(false);
      startRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const onDown = (e: React.MouseEvent) => {
    startRef.current = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y };
    setDragging(true);
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-40 pointer-events-none"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* barre de saisie draggable */}
      <div className="pointer-events-auto select-none cursor-grab active:cursor-grabbing mb-2 flex items-center gap-2">
        <div
          onMouseDown={onDown}
          className="h-3 w-28 rounded-full bg-slate-600/80 hover:bg-slate-500/90 transition-colors"
          title="Drag"
        />
      </div>
      <div ref={cardRef} className="pointer-events-auto">
        {children}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}