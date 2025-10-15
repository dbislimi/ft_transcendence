import { handleAuthoritativeTurnEnd } from './roomHandlers';
export function startTurnCheckInterval(roomEngines, rooms) {
    return setInterval(() => {
        checkAllActiveTurns(roomEngines, rooms);
    }, 1000);
}
export function checkAllActiveTurns(roomEngines, rooms) {
    for (const [roomId] of roomEngines) {
        handleAuthoritativeTurnEnd(roomId, roomEngines, rooms);
    }
}
export function cleanupInterval(interval) {
    if (interval) {
        clearInterval(interval);
    }
}
