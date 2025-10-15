import pino from 'pino';
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    } : undefined
});
export const bombPartyLogger = logger.child({ module: 'bombparty' });
export function logWSConnection(playerId, action) {
    bombPartyLogger.info({ playerId, action }, 'WebSocket connection event');
}
export function logGameEvent(roomId, event, playerId, data) {
    bombPartyLogger.info({ roomId, event, playerId, data }, 'Game event');
}
export function logGameError(roomId, error, playerId, data) {
    bombPartyLogger.error({ roomId, error, playerId, data }, 'Game error');
}
export function logValidationError(playerId, error, input) {
    bombPartyLogger.warn({ playerId, error, input }, 'Validation error');
}
export function logTurnEvent(roomId, playerId, event, duration) {
    bombPartyLogger.info({ roomId, playerId, event, duration }, 'Turn event');
}
