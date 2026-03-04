import pino from "pino";

const logger = pino({
	level: process.env.LOG_LEVEL || "info",
	transport:
		process.env.NODE_ENV === "development"
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "SYS:standard",
						ignore: "pid,hostname",
					},
				}
			: undefined,
	formatters: {
		level: (label) => {
			return { level: label };
		},
	},
});

export const bombPartyLogger = logger.child({ module: "bombparty" });

interface LogContext {
	roomId?: string;
	playerId?: string;
	matchId?: number;
	userId?: number;
	[key: string]: any;
}

function createContextLogger(context: LogContext) {
	return bombPartyLogger.child(context);
}

export function measureLatency<T>(
	operation: () => T | Promise<T>,
	context: LogContext,
	operationName: string,
): T | Promise<T> {
	const startTime = Date.now();
	const contextLogger = createContextLogger(context);

	try {
		const result = operation();

		if (result instanceof Promise) {
			return result
				.then((value) => {
					const latency = Date.now() - startTime;
					contextLogger.info(
						{ latency, operation: operationName },
						"Operation completed",
					);
					return value;
				})
				.catch((error) => {
					const latency = Date.now() - startTime;
					contextLogger.error(
						{
							latency,
							operation: operationName,
							error: error.message,
						},
						"Operation failed",
					);
					throw error;
				});
		} else {
			const latency = Date.now() - startTime;
			contextLogger.info(
				{ latency, operation: operationName },
				"Operation completed",
			);
			return result;
		}
	} catch (error: any) {
		const latency = Date.now() - startTime;
		contextLogger.error(
			{ latency, operation: operationName, error: error.message },
			"Operation failed",
		);
		throw error;
	}
}

export function logWSConnection(
	playerId: string,
	action: "connect" | "disconnect" | "reconnect",
	userId?: number,
): void {
	const context: LogContext = { playerId };
	if (userId) context.userId = userId;

	createContextLogger(context).info({ action }, "WebSocket connection event");
}

export function logGameEvent(
	roomId: string,
	event: string,
	playerId?: string,
	data?: any,
	matchId?: number,
): void {
	const context: LogContext = { roomId };
	if (playerId) context.playerId = playerId;
	if (matchId) context.matchId = matchId;

	createContextLogger(context).info({ event, data }, "Game event");
}

export function logGameError(
	roomId: string,
	error: string,
	playerId?: string,
	data?: any,
	matchId?: number,
): void {
	const context: LogContext = { roomId };
	if (playerId) context.playerId = playerId;
	if (matchId) context.matchId = matchId;

	createContextLogger(context).error({ error, data }, "Game error");
}

export function logValidationError(
	playerId: string,
	error: string,
	input?: any,
	roomId?: string,
): void {
	const context: LogContext = { playerId };
	if (roomId) context.roomId = roomId;

	createContextLogger(context).warn({ error, input }, "Validation error");
}

export function logTurnEvent(
	roomId: string,
	playerId: string,
	event: "start" | "end" | "expired",
	duration?: number,
	matchId?: number,
): void {
	const context: LogContext = { roomId, playerId };
	if (matchId) context.matchId = matchId;

	createContextLogger(context).info({ event, duration }, "Turn event");
}

export function logCheatAttempt(
	playerId: string,
	roomId: string,
	cheatType:
		| "invalid_word"
		| "timing_anomaly"
		| "duplicate_submission"
		| "rate_limit_exceeded",
	details?: any,
	matchId?: number,
): void {
	const context: LogContext = { roomId, playerId };
	if (matchId) context.matchId = matchId;

	createContextLogger(context).warn(
		{ cheatType, details },
		"Cheat attempt detected",
	);
}

export function logNetworkLatency(
	playerId: string,
	roomId: string,
	latency: number,
	operation: string,
	matchId?: number,
): void {
	const context: LogContext = { roomId, playerId };
	if (matchId) context.matchId = matchId;

	const level = latency > 1000 ? "warn" : "info";
	createContextLogger(context)[level](
		{ latency, operation },
		"Network latency",
	);
}

export function logError(
	error: Error | string,
	context: LogContext,
	level: "error" | "fatal" = "error",
): void {
	const errorMessage = error instanceof Error ? error.message : error;
	const errorStack = error instanceof Error ? error.stack : undefined;

	createContextLogger(context)[level](
		{ error: errorMessage, stack: errorStack },
		"Error occurred",
	);
}

export function logMetric(
	metricName: string,
	value: number,
	context: LogContext,
	unit?: string,
): void {
	createContextLogger(context).info(
		{ metric: metricName, value, unit },
		"Performance metric",
	);
}
