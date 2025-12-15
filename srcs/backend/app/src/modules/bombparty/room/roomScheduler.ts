import { BombPartyEngine } from '../GameEngine.js';
import type { Room } from './roomTypes.js';
import { broadcastGameState, broadcastTurnStartedWithState, handleGameEnd } from './roomHandlers.js';

export function startTurnCheckInterval(
  roomEngines: Map<string, BombPartyEngine>,
  rooms: Map<string, Room>
): NodeJS.Timeout {
  return setInterval(() => {
    checkAllActiveTurns(roomEngines, rooms);
  }, 1000);
}

export function checkAllActiveTurns(
  roomEngines: Map<string, BombPartyEngine>,
  rooms: Map<string, Room>
): void {
  for (const [roomId, engine] of roomEngines) {
    if (engine.checkAndEndExpiredTurn()) {
      const gameState = engine.getState();
      if (gameState.phase === 'TURN_ACTIVE') {
        broadcastTurnStartedWithState(roomId, roomEngines, rooms);
      } else {
        broadcastGameState(roomId, roomEngines, rooms);
      }
      
      if (engine.isGameOver()) {
        handleGameEnd(roomId, roomEngines, rooms);
      }
    }
  }
}

export function cleanupInterval(interval: NodeJS.Timeout | null): void {
  if (interval) {
    clearInterval(interval);
  }
}
