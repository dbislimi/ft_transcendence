import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BombPartyEngine } from '../core/engine';
import { TurnTimer, useTurnTimer } from '../core/timer';
import type { GameConfig, GamePhase } from '../core/types';
import { debugDictionary } from '../data/validator';
import Menu from './Menu';
import PlayerCircle from './PlayerCircle';
import BombTimer from './BombTimer';
import WordInput from './WordInput';
import Countdown from './Countdown';

// Flag pour activer/désactiver les suggestions
const SUGGESTIONS_ENABLED = true;

export default function BombPartyPage() {
  const { t } = useTranslation();
  const [gamePhase, setGamePhase] = useState<'MENU' | 'GAME'>('MENU');
  const [engine] = useState(() => new BombPartyEngine());
  const [timer] = useState(() => new TurnTimer());
  const [countdown, setCountdown] = useState(3);
  const [gameState, setGameState] = useState(engine.getState());
  const [wordJustSubmitted, setWordJustSubmitted] = useState(false);
  const [turnInProgress, setTurnInProgress] = useState(false);
  const [timerGracePeriod, setTimerGracePeriod] = useState(false);
  const [turnStartTime, setTurnStartTime] = useState(0);

  const remainingMs = useTurnTimer(timer, gameState.phase === 'TURN_ACTIVE');

  const startGame = useCallback((config: GameConfig) => {
    console.log('🎮 Démarrage du jeu avec config:', config);
    
    // Déboguer le dictionnaire au démarrage
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
          
          // Démarrer le timer automatiquement pour le premier tour
          timer.startTurn(15000);
          setGameState(engine.getState());
          
          // Enregistrer le temps de début du tour
          setTurnStartTime(performance.now());
          
          // Activer le délai de grâce
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
    
    // Marquer qu'un mot vient d'être soumis pour éviter le conflit de timeout
    setWordJustSubmitted(true);
    setTurnInProgress(true);
    
    console.log('🔒 Flags activés - wordJustSubmitted: true, turnInProgress: true');
    
    const startTime = performance.now();
    const wordValid = engine.submitWord(word, 0);
    console.log('📋 Mot valide retourné par engine:', wordValid);
    setGameState(engine.getState());
    
    // Arrêter le timer immédiatement pour éviter l'expiration
    timer.stop();
    console.log('⏱️ Timer arrêté immédiatement');
    
    // Résoudre le tour après un court délai pour l'affichage
    setTimeout(() => {
      const timeExpired = false; // Force timeExpired à false car le mot a été soumis
      console.log('🔄 Résolution du tour - Mot valide:', wordValid, 'Temps expiré:', timeExpired);
      engine.resolveTurn(wordValid, timeExpired);
      setGameState(engine.getState());
      
      if (!engine.isGameOver()) {
        // Démarrer le prochain tour
        setTimeout(() => {
          console.log('🔄 Démarrage du prochain tour');
          engine.startTurn();
          // Démarrer le timer pour le prochain tour (30 secondes)
          console.log('⏱️ Timer démarré pour le prochain tour (30s)');
          timer.startTurn(30000);
          setGameState(engine.getState());
          
          // Enregistrer le temps de début du tour
          setTurnStartTime(performance.now());
          
          // Activer le délai de grâce (5 secondes) avant de permettre le timeout
          // Cela évite le conflit avec handleWordSubmit qui prend ~2.5 secondes
          setTimerGracePeriod(true);
          setTimeout(() => {
            setTimerGracePeriod(false);
            console.log('⏱️ Délai de grâce terminé - timeout autorisé');
          }, 5000);
          
          // Réinitialiser les flags après le démarrage du timer
          setWordJustSubmitted(false);
          setTurnInProgress(false);
          console.log('🔓 Flags réinitialisés - wordJustSubmitted: false, turnInProgress: false');
        }, 1000);
      }
    }, 1500);
  }, [engine, timer]);

  const handleBackToMenu = useCallback(() => {
    engine.reset();
    timer.stop();
    setGameState(engine.getState());
    setGamePhase('MENU');
    setCountdown(3);
  }, [engine, timer]);

  // Vérifier le timeout du timer
  useEffect(() => {
    // Debug: afficher l'état des flags et conditions
    if (gameState.phase === 'TURN_ACTIVE' && remainingMs <= 0) {
      console.log('🔍 Vérification timeout - Flags:', { wordJustSubmitted, turnInProgress, timerActive: timer.isTimerActive() });
    }
    
    // Vérifier que le timer est réellement actif ET que le temps est écoulé
    // ET qu'aucun tour n'est en cours de résolution
    // ET que le délai de grâce est terminé
    // ET qu'aucun mot n'a été soumis récemment (évite le conflit avec handleWordSubmit)
    // ET que le tour a eu le temps de démarrer (au moins 2 secondes)
    const timeSinceTurnStart = performance.now() - turnStartTime;
    if (gameState.phase === 'TURN_ACTIVE' && remainingMs <= 0 && !wordJustSubmitted && !turnInProgress && !timerGracePeriod && timer.isTimerActive() && timeSinceTurnStart > 2000) {
      console.log('⏰ Temps écoulé pour le tour actuel');
      
      // Marquer qu'un tour est en cours pour éviter le double appel
      setTurnInProgress(true);
      
      // Temps écoulé
      const wordValid = false;
      const timeExpired = true;
      engine.resolveTurn(wordValid, timeExpired);
      timer.stop();
      setGameState(engine.getState());
      
      if (!engine.isGameOver()) {
        // Démarrer le prochain tour
        setTimeout(() => {
          console.log('🔄 Démarrage du prochain tour après timeout');
          engine.startTurn();
          timer.startTurn(30000);
          setGameState(engine.getState());
          // Réinitialiser le flag après le démarrage du timer
          setTurnInProgress(false);
        }, 1000);
      }
    }
  }, [remainingMs, gameState.phase, engine, timer, wordJustSubmitted, turnInProgress, timerGracePeriod, turnStartTime]);

  if (gamePhase === 'MENU') {
    return <Menu onStart={startGame} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
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
        {/* Informations du trigramme actuel */}
        {gameState.phase === 'TURN_ACTIVE' && gameState.currentTrigram && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
            <div className="bg-slate-800/90 backdrop-blur-md rounded-xl border border-purple-500/30 p-4 text-center">
              <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
                {gameState.currentTrigram}
              </div>
              {(() => {
                const trigramInfo = engine.getCurrentTrigramInfo();
                return (
                  <div className="text-sm text-slate-300">
                    {trigramInfo.availableWords} mots disponibles sur {trigramInfo.totalWords}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Suggestions de mots */}
        {SUGGESTIONS_ENABLED && gameState.phase === 'TURN_ACTIVE' && gameState.currentTrigram && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-30">
            <div className="bg-slate-800/90 backdrop-blur-md rounded-xl border border-purple-500/30 p-3">
              <div className="text-xs text-slate-400 mb-2 text-center">
                {t('bombParty.game.wordSuggestions')}
              </div>
              <div className="flex gap-2 flex-wrap justify-center max-w-xs">
                {engine.getWordSuggestions(3).map((word, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-600/30 text-purple-200 text-xs rounded-md border border-purple-500/30"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cercle des joueurs */}
        <PlayerCircle
          players={gameState.players}
          currentPlayerIndex={gameState.currentPlayerIndex}
        />

        {/* Bombe, timer et trigramme au centre */}
        <BombTimer
          trigram={gameState.currentTrigram}
          remainingMs={remainingMs}
          isActive={gameState.phase === 'TURN_ACTIVE'}
          usageCount={engine.getCurrentTrigramUsageCount()}
          totalPlayers={engine.getTotalPlayersInRound()}
        />

        {/* Saisie du mot */}
        <WordInput
          trigram={gameState.currentTrigram}
          usedWords={gameState.usedWords}
          onSubmit={handleWordSubmit}
          isActive={gameState.phase === 'TURN_ACTIVE'}
          engine={engine}
        />

        {/* Bouton retour au menu */}
        <button
          onClick={handleBackToMenu}
          className="absolute top-6 left-6 px-4 py-2 bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-all duration-200"
        >
          {t('bombParty.backToMenu')}
        </button>
      </div>
    </div>
  );
}
