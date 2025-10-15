import { BombPartyEngine } from '../GameEngine';
import type { Room } from './roomTypes';
import { broadcastGameState, handleGameEnd } from './roomHandlers';

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
      broadcastGameState(roomId, roomEngines, rooms);
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
