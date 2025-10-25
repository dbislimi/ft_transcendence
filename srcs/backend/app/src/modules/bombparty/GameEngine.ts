import type { 
  GameState, 
  Player, 
  GameConfig, 
  BonusKey, 
  TurnStartedEvent,
  GameStateSyncEvent
} from './types.ts';
import {
  getInitialState,
  createGamePlayers,
  createGameState,
  isGameOver,
  getWinner,
  getCurrentPlayer,
  getAlivePlayersCount
} from './engine/index.ts';
import {
  startCountdown,
  startTurn,
  resolveTurn,
  nextPlayer,
  isTurnExpired,
  checkAndEndExpiredTurn
} from './engine/index.ts';
import {
  submitWord,
  giveRandomBonus
} from './engine/index.ts';
import {
  getTurnDurationForCurrentPlayer,
  activateBonus
} from './engine/index.ts';
import { getRandomTrigram } from './trigramSelector.ts';

export class BombPartyEngine {
  private state: GameState;
  private lastTrigram: string = '';
  private currentTrigramUsageCount: number = 0;
  private doubleChanceConsumedThisTurn: boolean = false;

  constructor() {
    this.state = getInitialState();
  }

  initializeGame(players: Array<{ id: string; name: string }>, config: Partial<GameConfig> = {}): void {
    const gameConfig: GameConfig = {
      livesPerPlayer: config.livesPerPlayer || 3,
      turnDurationMs: config.turnDurationMs || 15000,
      playersCount: players.length
    };

    const gamePlayers = createGamePlayers(players, gameConfig);
    this.state = createGameState(gamePlayers, gameConfig);

    this.currentTrigramUsageCount = 0;
  }

  startCountdown(): void {
    startCountdown(this.state);
  }

  startTurn(): void {
    console.log('[BombParty DEBUG] startTurn() CALLED');
    this.currentTrigramUsageCount = 1;
    this.doubleChanceConsumedThisTurn = false;

    startTurn(
      this.state,
      () => this.getNewTrigram(),
      () => this.getTurnDurationForCurrentPlayer()
    );
    
    console.log(`[BombParty DEBUG] startTurn() COMPLETED -> currentTrigram=${this.state.currentTrigram}, currentPlayerIndex=${this.state.currentPlayerIndex}`);
  }

  isTurnExpired(): boolean {
    return isTurnExpired(this.state);
  }

  checkAndEndExpiredTurn(): boolean {
    return checkAndEndExpiredTurn(this.state, () => this.resolveTurn(false, true));
  }

  private getNewTrigram(): string {
    const newTrigram = getRandomTrigram(this.lastTrigram);
    this.lastTrigram = newTrigram;
    return newTrigram;
  }

  submitWord(word: string, msTaken: number): { 
    ok: boolean; 
    reason?: string; 
    consumedDoubleChance?: boolean 
  } {
    const result = submitWord(
      this.state,
      word,
      msTaken,
      this.doubleChanceConsumedThisTurn,
      () => this.giveRandomBonus(this.state.players[this.state.currentPlayerIndex]?.id || '')
    );
    
    if (result.consumedDoubleChance) {
      this.doubleChanceConsumedThisTurn = true;
    }
    
    return {
      ok: result.ok,
      reason: result.reason,
      consumedDoubleChance: result.consumedDoubleChance
    };
  }

  resolveTurn(wordValid: boolean, timeExpired: boolean): void {
    resolveTurn(
      this.state,
      wordValid,
      timeExpired,
      () => this.nextPlayer(),
      () => this.startTurn()
    );
    
    this.currentTrigramUsageCount++;
  }

  private nextPlayer(): void {
    nextPlayer(this.state);
  }

  activateBonus(playerId: string, bonusKey: BonusKey): { ok: boolean; meta?: any } {
    return activateBonus(this.state, playerId, bonusKey);
  }

  private peekNextAliveIndex(): number {
    if (this.state.players.length === 0) return -1;
    
    let idx = this.state.currentPlayerIndex;
    const len = this.state.players.length;
    
    for (let i = 0; i < len; i++) {
      const step = this.state.turnDirection === 1 ? 1 : -1;
      idx = (idx + step + len) % len;
      if (!this.state.players[idx].isEliminated) return idx;
    }
    
    return -1;
  }

  private giveRandomBonus(playerId: string): void {
    giveRandomBonus(this.state, playerId);
  }

  private getTurnDurationForCurrentPlayer(): number {
    return getTurnDurationForCurrentPlayer(this.state);
  }

  // --- Public getters ---

  getState(): GameState {
    return { ...this.state };
  }

  getCurrentPlayer(): Player | null {
    return getCurrentPlayer(this.state);
  }

  getAlivePlayersCount(): number {
    return getAlivePlayersCount(this.state);
  }

  isGameOver(): boolean {
    return isGameOver(this.state);
  }

  getWinner(): Player | null {
    return getWinner(this.state);
  }

  getFinalStats(): Array<{
    playerId: string;
    wordsSubmitted: number;
    validWords: number;
    maxStreak: number;
  }> {
    return this.state.players.map(player => {
      const playerHistory = this.state.history.filter(h => h.playerId === player.id);
      const validWords = playerHistory.filter(h => h.ok).length;
      
      return {
        playerId: player.id,
        wordsSubmitted: playerHistory.length,
        validWords,
        maxStreak: player.streak
      };
    });
  }

  getTurnStartedEvent(): TurnStartedEvent {
    return {
      t: 'turn_started',
      turnStartedAt: this.state.turnStartedAt,
      turnDurationMs: this.state.turnDurationMs,
      currentPlayerId: this.state.currentPlayerId
    };
  }

  getStateSyncEvent(): GameStateSyncEvent {
    return {
      t: 'game_state',
      gameState: this.getState()
    };
  }

  reset(): void {
    this.state = getInitialState();
    this.lastTrigram = '';
    this.currentTrigramUsageCount = 0;
    this.doubleChanceConsumedThisTurn = false;
  }
}
