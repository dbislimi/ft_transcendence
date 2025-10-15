import type { GameState, GameConfig, Player } from '../types';

export const STREAK_FOR_BONUS = 3;
export const DEFAULT_LIVES = 3;
export const DEFAULT_TURN_DURATION = 15000;
export const FAST_TURN_DURATION = 3000;

export function getInitialState(): GameState {
  return {
    phase: 'LOBBY',
    players: [],
    currentPlayerIndex: 0,
    currentPlayerId: '',
    currentTrigram: '',
    usedWords: [],
    turnStartedAt: 0,
    turnDurationMs: DEFAULT_TURN_DURATION,
    turnOrder: [],
    turnDirection: 1,
    baseTurnSeconds: Math.floor(DEFAULT_TURN_DURATION / 1000),
    history: []
  };
}

export function createGamePlayers(players: Array<{ id: string; name: string }>, config: GameConfig): Player[] {
  return players.map(p => ({
    id: p.id,
    name: p.name,
    lives: config.livesPerPlayer,
    isEliminated: false,
    streak: 0,
    bonuses: { 
      inversion: 0, 
      plus5sec: 0, 
      vitesseEclair: 0, 
      doubleChance: 0, 
      extraLife: 0 
    },
    pendingEffects: {}
  }));
}

export function createGameState(players: Player[], config: GameConfig): GameState {
  return {
    phase: 'COUNTDOWN',
    players,
    currentPlayerIndex: 0,
    currentPlayerId: players[0]?.id || '',
    currentTrigram: '',
    usedWords: [],
    turnStartedAt: 0,
    turnDurationMs: config.turnDurationMs,
    turnOrder: players.map(p => p.id),
    turnDirection: 1,
    baseTurnSeconds: Math.max(3, Math.floor(config.turnDurationMs / 1000)),
    history: []
  };
}

export function getAlivePlayers(state: GameState): Player[] {
  return state.players.filter(p => !p.isEliminated);
}

export function isGameOver(state: GameState): boolean {
  return state.phase === 'GAME_OVER';
}

export function getWinner(state: GameState): Player | null {
  if (state.phase !== 'GAME_OVER') return null;
  const alivePlayers = getAlivePlayers(state);
  return alivePlayers.length === 1 ? alivePlayers[0] : null;
}

export function getCurrentPlayer(state: GameState): Player | null {
  return state.players[state.currentPlayerIndex] || null;
}

export function getAlivePlayersCount(state: GameState): number {
  return getAlivePlayers(state).length;
}
