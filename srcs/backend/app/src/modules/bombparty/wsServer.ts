import { ErrorCode } from "./types.js";
import type { TypedError } from "./types.js";
import { bombPartyLogger } from "./log.js";

export interface WSConnection {
	socket: any;
	playerId?: string;
	roomId?: string;
	userId?: number; // JWT user ID
	lastPong: number;
	heartbeatInterval?: NodeJS.Timeout;
	messageCounts?: Map<string, { count: number; resetAt: number }>;
}

export class BombPartyWSServer {
	private connections = new Map<any, WSConnection>();
	private userToPlayerId = new Map<number, string>();
	private readonly PING_INTERVAL = 25000; // aligne avec frontend 20s + marge
	private readonly PONG_TIMEOUT = 15000;

	constructor() {
		this.startHeartbeatInterval();
	}

	private startHeartbeatInterval(): void {
		setInterval(() => {
			this.sendPingToAll();
		}, this.PING_INTERVAL);
	}

	private sendPingToAll(): void {
		const now = Date.now();

		for (const [socket, connection] of this.connections) {
			if (socket.readyState === 1) {
				try {
					socket.ping();
					bombPartyLogger.debug(
						{
							playerId: connection.playerId,
							lastPong: connection.lastPong,
							timeSinceLastPong: now - connection.lastPong,
						},
						"Ping sent"
					);
				} catch (error) {
					bombPartyLogger.error({ error }, "Ping error");
					this.closeConnection(socket, "PING_ERROR");
				}
			}
		}

		setTimeout(() => {
			this.checkPongTimeouts();
		}, this.PONG_TIMEOUT);
	}

	private checkPongTimeouts(): void {
		const now = Date.now();

		for (const [socket, connection] of this.connections) {
			if (socket.readyState === 1) {
				const timeSinceLastPong = now - connection.lastPong;
				if (timeSinceLastPong > this.PONG_TIMEOUT) {
					bombPartyLogger.warn(
						{
							playerId: connection.playerId,
							timeSinceLastPong,
						},
						"Pong timeout, closing connection"
					);
					this.closeConnection(socket, "PONG_TIMEOUT");
				}
			}
		}
	}

	registerConnection(
		socket: any,
		playerId?: string,
		roomId?: string,
		userId?: number
	): void {
		const connection: WSConnection = {
			socket,
			playerId,
			roomId,
			userId,
			lastPong: Date.now(),
			messageCounts: new Map(),
		};

		this.connections.set(socket, connection);

		socket.on("pong", () => {
			const conn = this.connections.get(socket);
			if (conn) {
				const now = Date.now();
				conn.lastPong = now;
				bombPartyLogger.debug(
					{
						playerId: conn.playerId,
						pongReceived: now,
					},
					"Pong received"
				);
			}
		});

		socket.on("close", () => {
			this.connections.delete(socket);
		});

		socket.on("error", (error) => {
			bombPartyLogger.error({ error }, "WebSocket error");
			this.connections.delete(socket);
		});
	}

	updateConnection(
		socket: any,
		playerId?: string,
		roomId?: string,
		userId?: number
	): void {
		const connection = this.connections.get(socket);
		if (connection) {
			connection.playerId = playerId;
			connection.roomId = roomId;
			if (userId !== undefined) {
				connection.userId = userId;
			}

			if (connection.userId !== undefined && connection.playerId) {
				this.userToPlayerId.set(connection.userId, connection.playerId);
			}
		}
	}

	closeConnection(socket: any, reason: string): void {
		const connection = this.connections.get(socket);
		if (connection) {
			bombPartyLogger.info(
				{
					playerId: connection.playerId,
					roomId: connection.roomId,
					reason,
				},
				"Closing connection"
			);
			this.connections.delete(socket);

			if (connection.heartbeatInterval) {
				clearInterval(connection.heartbeatInterval);
			}

			if (socket.readyState === 1) {
				socket.close(1008, reason); // 1008 = Policy Violation
			}
		}
	}

	getPlayerIdForUser(userId: number): string | undefined {
		return this.userToPlayerId.get(userId);
	}

	setPlayerIdForUser(userId: number, playerId: string): void {
		this.userToPlayerId.set(userId, playerId);
	}

	sendError(
		socket: any,
		error: string,
		code: ErrorCode = ErrorCode.STATE_ERROR
	): void {
		const message: TypedError = {
			t: "error",
			code,
			msg: error,
		};

		try {
			if (socket.readyState === 1) {
				socket.send(JSON.stringify(message));
			}
		} catch (err) {
			bombPartyLogger.error(
				{ error: err },
				"Error sending error message"
			);
		}
	}

	sendMessage(socket: any, message: any): void {
		try {
			if (socket.readyState === 1) {
				socket.send(JSON.stringify(message));
			}
		} catch (err) {
			bombPartyLogger.error({ error: err }, "Error sending message");
		}
	}

	checkRateLimit(
		socket: any,
		messageType: string,
		maxMessages: number = 10,
		windowMs: number = 2000
	): boolean {
		const connection = this.connections.get(socket);
		if (!connection) return false;

		if (!connection.messageCounts) {
			connection.messageCounts = new Map();
		}

		const now = Date.now();
		const countInfo = connection.messageCounts.get(messageType);

		if (!countInfo || now >= countInfo.resetAt) {
			connection.messageCounts.set(messageType, {
				count: 1,
				resetAt: now + windowMs,
			});
			return true;
		}

		if (countInfo.count >= maxMessages) {
			bombPartyLogger.warn(
				{
					playerId: connection.playerId,
					messageType,
					count: countInfo.count,
				},
				"Rate limit exceeded"
			);
			return false;
		}

		countInfo.count++;
		return true;
	}

	broadcastToAll(message: any): void {
		for (const [socket] of this.connections) {
			this.sendMessage(socket, message);
		}
	}

	broadcastToPlayers(playerIds: string[], message: any): void {
		for (const [socket, connection] of this.connections) {
			if (
				connection.playerId &&
				playerIds.includes(connection.playerId)
			) {
				this.sendMessage(socket, message);
			}
		}
	}

	getConnection(socket: any): WSConnection | undefined {
		return this.connections.get(socket);
	}

	getAllConnections(): WSConnection[] {
		return Array.from(this.connections.values());
	}

	cleanup(): void {
		for (const [socket] of this.connections) {
			this.closeConnection(socket, "SERVER_SHUTDOWN");
		}
		this.connections.clear();
	}
}
