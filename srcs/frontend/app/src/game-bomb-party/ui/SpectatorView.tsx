import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player, GameState } from '@shared/bombparty/types';

interface SpectatorViewProps {
  gameState: GameState;
  currentPlayerId: string | null;
  onQuit: () => void;
}

export default function SpectatorView({ gameState, currentPlayerId, onQuit }: SpectatorViewProps) {
  const { t } = useTranslation();
  const playerStats = useMemo(() => {
    return gameState.players.map(player => {
      const playerHistory = gameState.history.filter(h => h.playerId === player.id);
      const validWords = playerHistory.filter(h => h.ok);
      const invalidWords = playerHistory.filter(h => !h.ok);
      const totalResponseTime = playerHistory.reduce((sum, h) => sum + h.msTaken, 0);
      const averageResponseTime = playerHistory.length > 0 
        ? Math.round(totalResponseTime / playerHistory.length) 
        : 0;
      return {player,wordsSubmitted: playerHistory.length,validWords: validWords.length,invalidWords: invalidWords.length,currentStreak: player.streak,averageResponseTime,isAlive: !player.isEliminated && player.lives > 0
      };
    });
  }, [gameState.players, gameState.history]);

  const sortedStats = useMemo(() => {
    return [...playerStats].sort((a, b) => {
      if (a.isAlive && !b.isAlive) return -1;
      if (!a.isAlive && b.isAlive) return 1;
      if (a.isAlive && b.isAlive) {
        return b.player.lives - a.player.lives;
      }
      return b.wordsSubmitted - a.wordsSubmitted;
    });
  }, [playerStats]);

  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const isCurrentPlayerEliminated = currentPlayer?.isEliminated ?? false;
  const isGameOver = gameState.phase === 'GAME_OVER';
  const winner = isGameOver 
    ? (gameState as any).winner || gameState.players.find(p => !p.isEliminated && p.lives > 0)
    : null;
  const didPlayerWin = winner?.id === currentPlayerId;

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800/90 backdrop-blur-md rounded-xl border border-slate-600 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {isGameOver && (
          <div className={`sticky top-0 z-20 p-8 text-center border-b ${
            didPlayerWin 
              ? 'bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 border-yellow-500/50'
              : 'bg-gradient-to-r from-slate-700/50 to-slate-600/50 border-slate-500/50'
          }`}>
            <div className="text-6xl mb-4">
              {didPlayerWin ? '🏆' : '🎮'}
            </div>
            <h2 className={`text-4xl font-bold mb-3 ${
              didPlayerWin 
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 animate-double-chance-glow'
                : 'text-slate-200'
            }`}>
              {didPlayerWin 
                ? t('bombParty.gameOver.youWon', '🎉 Vous avez gagné ! 🎉')
                : t('bombParty.gameOver.youLost', 'Partie terminée')}
            </h2>
            {winner && (
              <p className="text-xl text-slate-300 mb-2">
                {didPlayerWin 
                  ? t('bombParty.gameOver.congratulations', 'Félicitations, champion !')
                  : t('bombParty.gameOver.winnerIs', 'Le gagnant est : {{name}}', { name: winner.name })}
              </p>
            )}
            {winner && (
              <p className="text-lg text-slate-400">
                {t('bombParty.gameOver.livesRemaining', '{{count}} vie(s) restante(s)', { count: winner.lives })}
              </p>
            )}
          </div>
        )}
        
        <div className="sticky top-0 bg-slate-800/95 backdrop-blur-md border-b border-slate-600 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-cyan-300 mb-2">
                {isGameOver 
                  ? t('bombParty.spectator.finalResults', 'Résultats finaux')
                  : t('bombParty.spectator.title', 'Mode Spectateur')}
              </h2>
              <p className="text-slate-400 text-sm">
                {isGameOver
                  ? t('bombParty.spectator.gameFinished', 'La partie est terminée')
                  : t('bombParty.spectator.description', 'Vous observez la partie en cours')}
              </p>
            </div>
            <button
              onClick={onQuit}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors duration-200 shadow-lg"
            >
              {t('bombParty.spectator.quit', 'Quitter la partie')}
            </button>
          </div>
        </div>
        <div className="p-6 border-b border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">
                {t('bombParty.spectator.currentSyllable', 'Syllabe actuelle')}
              </div>
              <div className="text-2xl font-bold text-cyan-300">
                {gameState.currentSyllable || '-'}
              </div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">
                {t('bombParty.spectator.phase', 'Phase')}
              </div>
              <div className="text-xl font-semibold text-slate-200">
                {gameState.phase === 'TURN_ACTIVE' 
                  ? t('bombParty.spectator.turnActive', 'Tour actif')
                  : gameState.phase === 'RESOLVE'
                  ? t('bombParty.spectator.resolving', 'Résolution')
                  : gameState.phase === 'GAME_OVER'
                  ? t('bombParty.spectator.gameOver', 'Partie terminée')
                  : gameState.phase}
              </div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">
                {t('bombParty.spectator.playersAlive', 'Joueurs vivants')}
              </div>
              <div className="text-2xl font-bold text-green-400">
                {gameState.players.filter(p => !p.isEliminated && p.lives > 0).length}
              </div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-1">
                {t('bombParty.spectator.wordsUsed', 'Mots utilisés')}
              </div>
              <div className="text-2xl font-bold text-slate-200">
                {gameState.usedWords?.length || 0}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-semibold text-slate-200 mb-4">
            {t('bombParty.spectator.playerStats', 'Statistiques des joueurs')}
          </h3>
          <div className="space-y-3">
            {sortedStats.map((stat) => {
              const isCurrentPlayer = stat.player.id === currentPlayerId;
              const winRate = stat.wordsSubmitted > 0 
                ? Math.round((stat.validWords / stat.wordsSubmitted) * 100) 
                : 0;
              return (
                <div
                  key={stat.player.id}
                  className={`bg-slate-700/50 rounded-lg p-4 border transition-all duration-200 ${
                    isCurrentPlayer 
                      ? 'border-cyan-400 shadow-lg shadow-cyan-400/20' 
                      : stat.isAlive
                      ? 'border-slate-600'
                      : 'border-red-500/50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`font-bold text-lg ${
                          isCurrentPlayer 
                            ? 'text-cyan-300' 
                            : stat.isAlive
                            ? 'text-slate-200'
                            : 'text-red-400'
                        }`}>
                          {stat.player.name}
                          {isCurrentPlayer && (
                            <span className="ml-2 text-sm text-cyan-400">
                              ({t('bombParty.spectator.you', 'Vous')})
                            </span>
                          )}
                        </span>
                        {stat.isAlive ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">
                            {t('bombParty.spectator.alive', 'Vivant')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">
                            {t('bombParty.spectator.eliminated', 'Éliminé')}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div>
                          <div className="text-slate-400 text-xs mb-1">
                            {t('bombParty.spectator.lives', 'Vies')}
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: stat.player.lives }, (_, i) => (
                              <img
                                key={i}
                                src="/img/bombparty/life.png"
                                alt="❤️"
                                className="w-4 h-4 object-contain"
                              />
                            ))}
                            <span className="text-slate-300 text-sm ml-1">
                              {stat.player.lives}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs mb-1">
                            {t('bombParty.spectator.streak', 'Série')}
                          </div>
                          <div className="text-slate-200 font-semibold">
                            {stat.currentStreak}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs mb-1">
                            {t('bombParty.spectator.words', 'Mots')}
                          </div>
                          <div className="text-slate-200 font-semibold">
                            {stat.validWords}/{stat.wordsSubmitted}
                            {stat.wordsSubmitted > 0 && (
                              <span className="text-slate-400 text-xs ml-1">
                                ({winRate}%)
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-xs mb-1">
                            {t('bombParty.spectator.avgTime', 'Temps moyen')}
                          </div>
                          <div className="text-slate-200 font-semibold">
                            {stat.averageResponseTime > 0 
                              ? `${(stat.averageResponseTime / 1000).toFixed(1)}s`
                              : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {gameState.history.length > 0 && (
          <div className="p-6 border-t border-slate-700">
            <h3 className="text-xl font-semibold text-slate-200 mb-4">
              {t('bombParty.spectator.recentHistory', 'Historique récent')}
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {gameState.history.slice(-10).reverse().map((entry, index) => {
                const player = gameState.players.find(p => p.id === entry.playerId);
                return (
                  <div
                    key={`${entry.playerId}-${index}`}
                    className={`flex items-center justify-between p-2 rounded ${
                      entry.ok 
                        ? 'bg-green-500/10 border border-green-500/20' 
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 font-medium">
                        {player?.name || 'Joueur inconnu'}
                      </span>
                      <span className={`font-mono ${
                        entry.ok ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {entry.word}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>
                        {entry.ok 
                          ? t('bombParty.spectator.valid', '✓ Valide')
                          : t('bombParty.spectator.invalid', '✗ Invalide')}
                      </span>
                      <span>
                        {(entry.msTaken / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
