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

export function logWSConnection(playerId: string, action: 'connect' | 'disconnect' | 'reconnect'): void {
  bombPartyLogger.info({ playerId, action }, 'WebSocket connection event');
}

export function logGameEvent(roomId: string, event: string, playerId?: string, data?: any): void {
  bombPartyLogger.info({ roomId, event, playerId, data }, 'Game event');
}

export function logGameError(roomId: string, error: string, playerId?: string, data?: any): void {
  bombPartyLogger.error({ roomId, error, playerId, data }, 'Game error');
}

export function logValidationError(playerId: string, error: string, input?: any): void {
  bombPartyLogger.warn({ playerId, error, input }, 'Validation error');
}

export function logTurnEvent(roomId: string, playerId: string, event: 'start' | 'end' | 'expired', duration?: number): void {
  bombPartyLogger.info({ roomId, playerId, event, duration }, 'Turn event');
}
