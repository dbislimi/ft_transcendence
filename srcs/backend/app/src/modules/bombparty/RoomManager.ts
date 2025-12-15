import WebSocket from "ws";
import { BombPartyEngine } from "./GameEngine.js";
import { BombPartyStatsManager } from "./StatsManager.js";
import { AsyncLock } from "../../utils/AsyncLock.js";
import {
	type Room,
	type PlayerConnection,
	type CreateRoomResult,
	type JoinRoomResult,
	type LeaveRoomResult,
	type StartGameResult,
	type GameInputResult,
	type ActivateBonusResult,
	type RoomDetailsResult,
	type RoomInfo,
	handleCreateRoom,
	handleJoinRoom,
	handleLeaveRoom,
	handleStartGame,
	handleGameInput,
	handleActivateBonus,
	handlePlayerDisconnect,
	startTurnCheckInterval,
	cleanupInterval,
} from "./room/index.js";
import { broadcastToRoom } from "./room/roomUtils.js";
import {
	broadcastTurnStartedWithState,
	broadcastGameState,
} from "./room/roomHandlers.js";

export class BombPartyRoomManager {
	private rooms = new Map<string, Room>();
	private players = new Map<string, PlayerConnection>();
	private roomEngines = new Map<string, BombPartyEngine>();
	private statsManager: BombPartyStatsManager;
	private turnCheckInterval: NodeJS.Timeout | null = null;
	private cleanupInterval: NodeJS.Timeout | null = null;
	private gameEndCallbacks = new Map<
		string,
		(roomId: string, winnerId?: string) => void
	>();
	private roomLocks = new Map<string, AsyncLock>();
	private disconnectionGracePeriods = new Map<string, NodeJS.Timeout>();
	private rejoinPrompts = new Map<
		string,
		{ roomId: string; timestamp: number; timeout: number }
	>();

	private readonly INACTIVE_ROOM_TIMEOUT = 30 * 60 * 1000;
	private readonly EMPTY_ROOM_TIMEOUT = 5 * 60 * 1000;

	constructor(statsManager: BombPartyStatsManager) {
		this.statsManager = statsManager;
		this.turnCheckInterval = this.startTurnCheckInterval();
		this.cleanupInterval = this.startCleanupInterval();
	}

	private getRoomLock(roomId: string): AsyncLock {
		if (!this.roomLocks.has(roomId)) {
			this.roomLocks.set(roomId, new AsyncLock());
		}
		return this.roomLocks.get(roomId)!;
	}

	registerGameEndCallback(
		roomId: string,
		callback: (roomId: string, winnerId?: string) => void
	): void {
		this.gameEndCallbacks.set(roomId, callback);
	}

	unregisterGameEndCallback(roomId: string): void {
		this.gameEndCallbacks.delete(roomId);
	}

	private triggerGameEndCallback(roomId: string, winnerId?: string): void {
		const callback = this.gameEndCallbacks.get(roomId);
		if (callback) {
			callback(roomId, winnerId);
			this.gameEndCallbacks.delete(roomId);
		}
	}

	private startTurnCheckInterval(): NodeJS.Timeout {
		const checkLoop = async () => {
			const roomIds = Array.from(this.roomEngines.keys());

			for (const roomId of roomIds) {
				const lock = this.getRoomLock(roomId);

				await lock.acquire(() => {
					const engine = this.roomEngines.get(roomId);
					if (!engine) return;

					if (engine.checkAndEndExpiredTurn()) {
						console.log(
							"[RoomManager] Tour expire detecte, broadcast de l'etat mis à jour"
						);
						const room = this.rooms.get(roomId);
						if (room) {
							const gameState = engine.getState();

							if (gameState.phase === "TURN_ACTIVE") {
								broadcastTurnStartedWithState(
									roomId,
									this.roomEngines,
									this.rooms
								);
							} else {
								broadcastGameState(roomId, this.roomEngines, this.rooms);
							}
						}

						if (engine.isGameOver()) {
							const winner = engine.getWinner();
							const winnerId = winner?.id;

							this.triggerGameEndCallback(roomId, winnerId);

							const finalStats = engine.getFinalStats();
							if (room) {
								broadcastToRoom(room, {
									event: "bp:game:end",
									payload: {
										roomId,
										winner: winner || undefined,
										finalStats,
									},
								});

								this.saveGameStats(roomId, room, engine, winnerId);
							}

							this.roomEngines.delete(roomId);
							if (room) {
								room.startedAt = undefined;
							}

							if (room && room.players.size === 0) {
								this.rooms.delete(roomId);
								this.roomLocks.delete(roomId);
							}
						}
					}
				});
			}

			if (this.turnCheckInterval) {
				this.turnCheckInterval = setTimeout(checkLoop, 150);
			}
		};

		return setTimeout(checkLoop, 150);
	}

	registerPlayer(
		ws: WebSocket,
		playerId: string,
		playerName: string,
		userId?: number
	): void {
		const player: PlayerConnection = {
			id: playerId,
			name: playerName,
			ws,
			roomId: undefined,
			userId,
		};

		this.players.set(playerId, player);

		ws.on("close", async () => {
			const currentPlayer = this.players.get(playerId);
			const roomId = currentPlayer?.roomId;

			if (roomId) {
				const lock = this.getRoomLock(roomId);
				await lock.acquire(() => {
					const result = handlePlayerDisconnect(
						playerId,
						this.players,
						this.rooms,
						this.roomEngines
					);
					if (result && result.winner) {
						const room = this.rooms.get(roomId);
						const engine = this.roomEngines.get(roomId);
					}
				});
			} else {
				handlePlayerDisconnect(
					playerId,
					this.players,
					this.rooms,
					this.roomEngines
				);
			}
		});
	}

	createRoom(
		creatorId: string,
		roomName: string,
		isPrivate: boolean,
		password?: string,
		maxPlayers?: number
	): CreateRoomResult {
		return handleCreateRoom(
			creatorId,
			roomName,
			isPrivate,
			password,
			maxPlayers,
			this.players,
			this.rooms
		);
	}

	async joinRoom(
		playerId: string,
		roomId: string,
		password?: string
	): Promise<JoinRoomResult> {
		const lock = this.getRoomLock(roomId);
		return lock.acquire(() => {
			return handleJoinRoom(
				playerId,
				roomId,
				password,
				this.players,
				this.rooms
			);
		});
	}

	async leaveRoom(
		playerId: string,
		roomId: string,
		ws?: WebSocket
	): Promise<LeaveRoomResult> {
		const lock = this.getRoomLock(roomId);
		return lock.acquire(() => {
			return handleLeaveRoom(
				playerId,
				roomId,
				this.players,
				this.rooms,
				this.roomEngines,
				ws
			);
		});
	}

	handlePlayerDisconnect(playerId: string): void {
		const player = this.players.get(playerId);
		if (!player) return;

		const roomId = player.roomId;
		if (roomId) {
			const lock = this.getRoomLock(roomId);
			lock.acquire(() => {
				handlePlayerDisconnect(
					playerId,
					this.players,
					this.rooms,
					this.roomEngines
				);
			});
		} else {
			handlePlayerDisconnect(
				playerId,
				this.players,
				this.rooms,
				this.roomEngines
			);
		}
	}

	async startGame(playerId: string, roomId: string): Promise<StartGameResult> {
		const lock = this.getRoomLock(roomId);

		return lock.acquire(() => {
			if (this.roomEngines.has(roomId)) {
				return { success: false, error: "Partie deja en cours" };
			}
			return handleStartGame(playerId, roomId, this.rooms, this.roomEngines);
		});
	}

	async handleGameInput(
		playerId: string,
		roomId: string,
		word: string,
		msTaken: number
	): Promise<GameInputResult> {
		const lock = this.getRoomLock(roomId);

		return lock.acquire(async () => {
			const room = this.rooms.get(roomId);
			const engine = this.roomEngines.get(roomId);

			if (engine && engine.isGameOver()) {
				return { success: false, error: "Game is already over" };
			}

			const result = await handleGameInput(
				playerId,
				roomId,
				word,
				msTaken,
				this.roomEngines,
				this.rooms
			);
			if (result.success && engine && room) {
				if (engine.isGameOver()) {
					console.log(`[RoomManager] Game over detected after input in room ${roomId}`);
					const winner = engine.getWinner();
					const winnerId = winner?.id;

					await this.saveGameStats(roomId, room, engine, winnerId);

					const finalStats = engine.getFinalStats();
					broadcastToRoom(room, {
						event: "bp:game:end",
						payload: {
							roomId,
							winner: winner || undefined,
							finalStats,
						},
					});

					this.triggerGameEndCallback(roomId, winnerId);

					this.roomEngines.delete(roomId);
					room.startedAt = undefined;
					if (room.players.size === 0) {
						this.rooms.delete(roomId);
						this.roomLocks.delete(roomId);
					}
				} else {
					const aliveCount = engine.getAlivePlayersCount();
				}
			}

			return result;
		});
	}

	async activateBonus(
		playerId: string,
		roomId: string,
		bonusKey: any
	): Promise<ActivateBonusResult> {
		const lock = this.getRoomLock(roomId);

		return lock.acquire(async () => {
			const room = this.rooms.get(roomId);
			const engine = this.roomEngines.get(roomId);

			const result = handleActivateBonus(
				playerId,
				roomId,
				bonusKey,
				this.roomEngines,
				this.rooms
			);

			if (result.success && engine && room) {
				if (engine.isGameOver()) {
					console.log(`[RoomManager] Game over detected after bonus activation in room ${roomId}`);
					const winner = engine.getWinner();
					const winnerId = winner?.id;

					await this.saveGameStats(roomId, room, engine, winnerId);

					const finalStats = engine.getFinalStats();
					broadcastToRoom(room, {
						event: "bp:game:end",
						payload: {
							roomId,
							winner: winner || undefined,
							finalStats,
						},
					});

					this.triggerGameEndCallback(roomId, winnerId);

					this.roomEngines.delete(roomId);
					room.startedAt = undefined;
					if (room.players.size === 0) {
						this.rooms.delete(roomId);
						this.roomLocks.delete(roomId);
					}
				}
			}

			return result;
		});
	}

	getRoomInfo(roomId: string): Room | undefined {
		return this.rooms.get(roomId);
	}

	getPlayerInfo(playerId: string): PlayerConnection | undefined {
		return this.players.get(playerId);
	}

	getAllRooms(): RoomInfo[] {
		const allRooms: RoomInfo[] = [];

		for (const [roomId, room] of this.rooms) {
			allRooms.push({
				id: roomId,
				name: room.name,
				players: room.players.size,
				maxPlayers: room.maxPlayers,
				isPrivate: room.isPrivate,
				isStarted: this.roomEngines.has(roomId),
				createdAt: room.createdAt,
			});
		}

		return allRooms.sort((a, b) => b.createdAt - a.createdAt);
	}

	getPublicRooms(): RoomInfo[] {
		return this.getAllRooms().filter((room) => !room.isPrivate);
	}

	getRoom(roomId: string): Room | undefined {
		return this.rooms.get(roomId);
	}

	getRoomDetails(roomId: string): RoomDetailsResult {
		const room = this.rooms.get(roomId);
		if (!room) {
			return { success: false, error: "Room not found" };
		}

		return {
			success: true,
			room: {
				id: room.id,
				name: room.name,
				isPrivate: room.isPrivate,
				players: Array.from(room.players.values()).map((p) => ({
					id: p.id,
					name: p.name,
				})),
				maxPlayers: room.maxPlayers,
				isStarted: this.roomEngines.has(roomId),
				createdAt: room.createdAt,
			},
		};
	}

	hasGameInProgress(roomId: string): boolean {
		return this.roomEngines.has(roomId);
	}

	markPlayerForRejoin(playerId: string, roomId: string): void {
		const timeoutMs = 10000;
		this.rejoinPrompts.set(playerId, {
			roomId,
			timestamp: Date.now(),
			timeout: timeoutMs,
		});

		setTimeout(() => {
			this.rejoinPrompts.delete(playerId);
		}, timeoutMs);
	}

	canPlayerRejoin(playerId: string, roomId: string): boolean {
		const prompt = this.rejoinPrompts.get(playerId);
		if (!prompt) return false;
		if (prompt.roomId !== roomId) return false;

		const elapsed = Date.now() - prompt.timestamp;
		if (elapsed > prompt.timeout) {
			this.rejoinPrompts.delete(playerId);
			return false;
		}

		this.rejoinPrompts.delete(playerId);
		return true;
	}

	getRoomStateForReconnect(
		playerId: string,
		roomId: string
	): {
		success: boolean;
		gameState?: any;
		sequenceNumber?: number;
		stateVersion?: number;
		error?: string;
	} {
		const room = this.rooms.get(roomId);
		if (!room) {
			return { success: false, error: "Room not found" };
		}

		if (!room.players.has(playerId)) {
			return { success: false, error: "Player not in room" };
		}

		const engine = this.roomEngines.get(roomId);
		if (!engine) {
			return {
				success: true,
				gameState: null,
				sequenceNumber: room.sequenceNumber || 0,
				stateVersion: room.stateVersion || 0,
			};
		}

		const gameState = engine.getState();
		const stateWithVersion = {
			...gameState,
			stateVersion: room.stateVersion || 0,
			sequenceNumber: room.sequenceNumber || 0,
		};

		return {
			success: true,
			gameState: stateWithVersion,
			sequenceNumber: room.sequenceNumber || 0,
			stateVersion: room.stateVersion || 0,
		};
	}

	private startCleanupInterval(): NodeJS.Timeout {
		return setInterval(async () => {
			await this.cleanupInactiveRooms();
		}, 60000);
	}

	private async cleanupInactiveRooms(): Promise<void> {
		const now = Date.now();
		const roomsToDelete: string[] = [];
		const roomIds = Array.from(this.rooms.keys());

		for (const roomId of roomIds) {
			const lock = this.getRoomLock(roomId);

			await lock.acquire(() => {
				const room = this.rooms.get(roomId);
				if (!room) return;

				const hasGameInProgress = this.roomEngines.has(roomId);
				const isEmpty = room.players.size === 0;
				const roomAge = now - room.createdAt;
				const lastActivity = room.startedAt || room.createdAt;
				const timeSinceLastActivity = now - lastActivity;

				if (isEmpty && roomAge > this.EMPTY_ROOM_TIMEOUT) {
					roomsToDelete.push(roomId);
					return;
				}

				if (
					!hasGameInProgress &&
					!isEmpty &&
					timeSinceLastActivity > this.INACTIVE_ROOM_TIMEOUT
				) {
					roomsToDelete.push(roomId);
					return;
				}

				if (hasGameInProgress) {
					const engine = this.roomEngines.get(roomId);
					if (engine && engine.isGameOver()) {
						const gameEndTime = room.startedAt || room.createdAt;
						if (now - gameEndTime > 10 * 60 * 1000) {
							roomsToDelete.push(roomId);
						}
					}
				}
			});
		}

		for (const roomId of roomsToDelete) {
			const lock = this.getRoomLock(roomId);
			await lock.acquire(() => {
				const room = this.rooms.get(roomId);
				if (room) {
					if (room.players.size > 0) {
						broadcastToRoom(room, {
							event: "bp:lobby:closed",
							payload: {
								roomId,
								reason: "Lobby inactif supprime",
							},
						});
					}

					this.roomEngines.delete(roomId);
					this.rooms.delete(roomId);
					this.roomLocks.delete(roomId);
					console.log(`[RoomManager] Lobby inactif supprime: ${roomId}`);
				}
			});
		}

		if (roomsToDelete.length > 0) {
			this.broadcastLobbyListUpdate();
		}
	}

	private broadcastLobbyListCallback: (() => void) | null = null;

	setBroadcastLobbyListCallback(callback: () => void): void {
		this.broadcastLobbyListCallback = callback;
	}

	broadcastLobbyListUpdate(): void {
		if (this.broadcastLobbyListCallback) {
			this.broadcastLobbyListCallback();
		}
	}

	cleanup(): void {
		if (this.turnCheckInterval) {
			clearTimeout(this.turnCheckInterval);
			this.turnCheckInterval = null;
		}
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.rooms.clear();
		this.players.clear();
		this.roomEngines.clear();
		this.gameEndCallbacks.clear();
		this.roomLocks.clear();
	}

	private async saveGameStats(
		roomId: string,
		room: Room,
		engine: BombPartyEngine,
		winnerId?: string
	): Promise<void> {
		console.log(`[RoomManager] Attempting to save stats for room ${roomId}`);
		if (!room.startedAt) {
			console.log(`[RoomManager] Room ${roomId} has no startedAt date, skipping stats`);
			return;
		}

		const matchDuration = Date.now() - room.startedAt;
		const finalStats = engine.getFinalStats();
		const gameState = engine.getState();

		console.log(`[RoomManager] Final stats count: ${finalStats.length}`);

		const matchId = Math.floor(Date.now());

		for (const playerStat of finalStats) {
			const playerConnection = this.players.get(playerStat.playerId);
			if (!playerConnection) {
				console.log(`[RoomManager] Player ${playerStat.playerId} not found in connections`);
				continue;
			}

			if (!playerConnection.userId) {
				console.log(`[RoomManager] Player ${playerStat.playerId} (${playerConnection.name}) has no userId (Guest?), skipping stats`);
				continue;
			}

			const userId = playerConnection.userId;
			const isWin = playerStat.playerId === winnerId;

			console.log(`[RoomManager] Processing stats for user ${userId} (Win: ${isWin})`);

			const playerHistory = gameState.history.filter(h => h.playerId === playerStat.playerId && h.ok);
			const totalTime = playerHistory.reduce((acc, h) => acc + h.msTaken, 0);
			const averageResponseTime = playerHistory.length > 0 ? Math.round(totalTime / playerHistory.length) : 0;
			const playerState = gameState.players.find(p => p.id === playerStat.playerId);
			const finalLives = playerState ? playerState.lives : 0;
			const position = isWin ? 1 : 2;

			const matchData = {
				isWin,
				wordsSubmitted: playerStat.wordsSubmitted,
				validWords: playerStat.validWords,
				bestStreak: playerStat.maxStreak,
				averageResponseTime,
				matchDuration,
			};

			const historyData = {
				position,
				wordsSubmitted: playerStat.wordsSubmitted,
				validWords: playerStat.validWords,
				finalLives,
				matchDuration,
			};

			try {
				const updateResult = await this.statsManager.updateUserStats(userId, matchData);
				if (!updateResult.success) {
					console.error(`[RoomManager] Failed to update user stats for ${userId}:`, updateResult.error);
				}

				const historyResult = await this.statsManager.addMatchHistory(userId, matchId, historyData);
				if (!historyResult.success) {
					console.error(`[RoomManager] Failed to add match history for ${userId}:`, historyResult.error);
				}

				console.log(`[RoomManager] Stats saved for user ${userId} (Match ${matchId})`);
			} catch (error) {
				console.error(`[RoomManager] Error saving stats for user ${userId}:`, error);
			}
		}
	}
}
