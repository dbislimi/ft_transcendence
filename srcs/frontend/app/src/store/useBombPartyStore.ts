import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { logger } from "../utils/logger";
import type { Player, BonusKey } from "../types/bombparty";
import type { GameState } from "../game-bomb-party/core/types";

export type GamePhase =
	| "RULES"
	| "LOBBY"
	| "PLAYERS"
	| "GAME"
	| "TURN_ACTIVE"
	| "GAME_OVER";
export type ConnectionStateType =
	| "disconnected"
	| "connecting"
	| "connected"
	| "reconnecting"
	| "server_unreachable";

export interface UIState {
	wordJustSubmitted: boolean;
	turnInProgress: boolean;
	timerGracePeriod: boolean;
	timerFlash: boolean;
	profilePlayerId: string | null;
	infoOpen: boolean;
}

export interface LobbyInfo {
	id: string;
	name: string;
	players: number;
	maxPlayers: number;
	isPrivate: boolean;
	isStarted: boolean;
	createdAt: number;
}

export interface ConnectionState {
	state: ConnectionStateType;
	playerId: string | null;
	roomId: string | null;
	isHost: boolean;
	lobbyPlayers: Array<{ id: string; name: string }>;
	lobbyMaxPlayers: number;
	isAuthenticating: boolean;
	reconnectAttempts: number;
	lastError: string | null;
}

export interface UserPreferences {
	suggestionsEnabled: boolean;
	suggestionsCount: 0 | 3 | 5 | 10;
	suggestionsDifficulty: "easy" | "medium" | "hard" | "all";
}

const STORAGE_KEY = "bombParty_userPreferences";
const defaultPreferences: UserPreferences = {
	suggestionsEnabled: true,
	suggestionsCount: 5,
	suggestionsDifficulty: "all",
};

function loadPreferencesFromStorage(): UserPreferences {
	try {
		const stored = sessionStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return { ...defaultPreferences, ...parsed };
		}
	} catch (error) {
		logger.warn("Erreur lors du chargement des preferences", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
	return defaultPreferences;
}

function savePreferencesToStorage(preferences: UserPreferences): void {
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
	} catch (error) {
		logger.warn("Erreur lors de la sauvegarde des preferences", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export interface BombPartyStore {
	gamePhase: GamePhase;
	gameState: GameState | null;
	ui: UIState;
	connection: ConnectionState;
	lobbies: LobbyInfo[];
	playerNameModalOpen: boolean;
	gameMode: "local" | "multiplayer";
	multiplayerType: "quickmatch" | null;
	countdown: number;
	gameStartTime: number | null;
	bonusNotification: { bonusKey: BonusKey; playerName: string } | null;
	turnStartTime: number;
	optimisticLifeLoss: { playerId: string; timestamp: number } | null;
	userPreferences: UserPreferences;

	setGamePhase: (phase: GamePhase) => void;
	receiveServerState: (gameState: GameState) => void;
	applyGameStateDelta: (delta: any, sequenceNumber?: number) => void;
	handleTurnStarted: (
		turnStartedAt: number,
		turnDurationMs: number,
		currentPlayerId: string
	) => void;
	submitWord: (word: string, msTaken: number) => void;
	activateBonus: (bonusKey: BonusKey) => void;
	joinRoom: (roomId: string, password?: string) => void;
	leaveRoom: () => void;
	createRoom: (
		name: string,
		isPrivate: boolean,
		password?: string,
		maxPlayers?: number
	) => void;
	startGame: () => void;
	setLobbies: (lobbies: LobbyInfo[]) => void;
	requestLobbyList: () => void;
	setConnectionState: (state: ConnectionStateType) => void;
	setPlayerId: (playerId: string | null) => void;
	setRoomId: (roomId: string | null) => void;
	setIsHost: (isHost: boolean) => void;
	setLobbyPlayers: (players: Array<{ id: string; name: string }>) => void;
	setLobbyMaxPlayers: (maxPlayers: number) => void;
	setIsAuthenticating: (isAuthenticating: boolean) => void;
	setReconnectAttempts: (attempts: number) => void;
	setLastError: (error: string | null) => void;
	setPlayerNameModalOpen: (open: boolean) => void;
	setWordJustSubmitted: (submitted: boolean) => void;
	setTurnInProgress: (inProgress: boolean) => void;
	setTimerGracePeriod: (gracePeriod: boolean) => void;
	setTimerFlash: (flash: boolean) => void;
	setProfilePlayerId: (playerId: string | null) => void;
	setInfoOpen: (open: boolean) => void;
	setGameMode: (mode: "local" | "multiplayer") => void;
	setMultiplayerType: (type: "quickmatch" | null) => void;
	setCountdown: (count: number) => void;
	setGameStartTime: (time: number | null) => void;
	setBonusNotification: (
		notification: { bonusKey: BonusKey; playerName: string } | null
	) => void;
	setTurnStartTime: (time: number) => void;
	setOptimisticLifeLoss: (
		lifeLoss: { playerId: string; timestamp: number } | null
	) => void;
	setUserPreferences: (preferences: Partial<UserPreferences>) => void;
	resetUserPreferences: () => void;
	getCurrentPlayer: () => Player | null;
	getRemainingTime: () => number;
	isMyTurn: () => boolean;
	canSubmitWord: () => boolean;
	applyOptimisticWordSubmit: (word: string) => void;
	revertOptimisticWordSubmit: (word: string) => void;
}

const initialGameState: GameState = {
	phase: "LOBBY",
	players: [],
	currentPlayerIndex: 0,
	currentPlayerId: "",
	currentSyllable: "",
	usedWords: [],
	turnStartedAt: 0,
	turnDurationMs: 15000,
	turnOrder: [],
	turnDirection: 1,
	baseTurnSeconds: 15,
	history: [],
};

const initialUIState: UIState = {
	wordJustSubmitted: false,
	turnInProgress: false,
	timerGracePeriod: false,
	timerFlash: false,
	profilePlayerId: null,
	infoOpen: false,
};

const initialConnectionState: ConnectionState = {
	state: "disconnected",
	playerId: null,
	roomId: null,
	isHost: false,
	lobbyPlayers: [],
	lobbyMaxPlayers: 4,
	isAuthenticating: false,
	reconnectAttempts: 0,
	lastError: null,
};

export const useBombPartyStore = create<BombPartyStore>()(
	subscribeWithSelector((set, get) => ({
		gamePhase: "RULES",
		gameState: null,
		ui: initialUIState,
		connection: initialConnectionState,
		lobbies: [],
		playerNameModalOpen: false,
		gameMode: "local",
		multiplayerType: null,
		countdown: 3,
		gameStartTime: null,
		bonusNotification: null,
		turnStartTime: 0,
		optimisticLifeLoss: null,
		userPreferences: loadPreferencesFromStorage(),

		setGamePhase: (phase) => set({ gamePhase: phase }),
		receiveServerState: (gameState) => {
			try {
				if (!gameState) {
					logger.warn(
						"receiveServerState called with undefined gameState",
						{
							currentState: get().gameState ? "exists" : "null",
						}
					);
					return;
				}

				const currentState = get().gameState;

				if (
					currentState &&
					gameState.sequenceNumber !== undefined &&
					currentState.sequenceNumber !== undefined
				) {
					if (
						gameState.sequenceNumber < currentState.sequenceNumber
					) {
						logger.debug("Message obsolete ignore", {
							received: gameState.sequenceNumber,
							current: currentState.sequenceNumber,
						});
						return;
					}
				}

				const optimisticLoss = get().optimisticLifeLoss;
				if (optimisticLoss && currentState) {
					const serverPlayer = gameState.players?.find(
						(p: any) => p.id === optimisticLoss.playerId
					);
					const currentPlayer = currentState.players?.find(
						(p: any) => p.id === optimisticLoss.playerId
					);

					if (
						serverPlayer &&
						currentPlayer &&
						serverPlayer.lives < currentPlayer.lives
					) {
						set({ gameState, optimisticLifeLoss: null });
						return;
					}

					if (
						serverPlayer &&
						currentPlayer &&
						serverPlayer.lives === currentPlayer.lives
					) {
						logger.debug("Correction de l'etat optimiste", {
							playerId: optimisticLoss.playerId,
							serverLives: serverPlayer.lives,
							optimisticLives: currentPlayer.lives,
						});
						set({ gameState, optimisticLifeLoss: null });
						return;
					}
				}

				set({ gameState });
			} catch (error) {
				logger.error("Error in receiveServerState", error, {
					hasGameState: !!gameState,
					currentStateExists: !!get().gameState,
				});
			}
		},

		applyGameStateDelta: (delta, sequenceNumber) => {
			try {
				const currentState = get().gameState;

				if (!currentState) {
					logger.warn("Cannot apply delta: no current game state", {
						sequenceNumber,
						deltaKeys: Object.keys(delta || {}),
					});
					return;
				}

				if (
					sequenceNumber !== undefined &&
					currentState.sequenceNumber !== undefined
				) {
					if (sequenceNumber < currentState.sequenceNumber) {
						logger.debug("Delta obsolete ignore", {
							received: sequenceNumber,
							current: currentState.sequenceNumber,
						});
						return;
					}
				}

				const updatedState: GameState = { ...currentState };

				if (delta.phase !== undefined) {
					updatedState.phase = delta.phase;
				}

				if (delta.currentPlayerIndex !== undefined) {
					updatedState.currentPlayerIndex = delta.currentPlayerIndex;
				}

				if (delta.currentPlayerId !== undefined) {
					updatedState.currentPlayerId = delta.currentPlayerId;
				}

				if (delta.currentSyllable !== undefined) {
					updatedState.currentSyllable = delta.currentSyllable;
				}

				if (delta.usedWords !== undefined) {
					updatedState.usedWords = delta.usedWords;
				}

				if (delta.turnStartedAt !== undefined) {
					updatedState.turnStartedAt = delta.turnStartedAt;

					if (
						delta.phase === "TURN_ACTIVE" ||
						updatedState.phase === "TURN_ACTIVE"
					) {
						const currentTurnStartTime = get().turnStartTime;
						const newTurnStartedAt = delta.turnStartedAt;

						if (
							newTurnStartedAt &&
							newTurnStartedAt !== currentTurnStartTime
						) {
							logger.info(
								"🎯 applyGameStateDelta - Mise à jour de turnStartTime depuis delta",
								{
									currentTurnStartTime,
									newTurnStartedAt,
									isNewTurn:
										currentTurnStartTime > 0 &&
										currentTurnStartTime !==
											newTurnStartedAt,
									sequenceNumber,
									deltaKeys: Object.keys(delta),
								}
							);
							set({ turnStartTime: newTurnStartedAt });
						}
					}
				}

				if (delta.turnDurationMs !== undefined) {
					updatedState.turnDurationMs = delta.turnDurationMs;
				}

				if (delta.winner !== undefined) {
					updatedState.winner = delta.winner;
				}

				if (delta.players !== undefined) {
					if (Array.isArray(delta.players)) {
						if (
							delta.players.length > 0 &&
							delta.players[0].index !== undefined
						) {
							const playersCopy = [...updatedState.players];
							for (const playerDelta of delta.players) {
								if (
									playerDelta.index !== undefined &&
									playerDelta.player
								) {
									playersCopy[playerDelta.index] =
										playerDelta.player;
								}
							}
							updatedState.players = playersCopy;
						} else {
							updatedState.players = delta.players;
						}
					}
				}

				if (sequenceNumber !== undefined) {
					updatedState.sequenceNumber = sequenceNumber;
				}

				set({ gameState: updatedState });

				logger.debug("Delta applied successfully", {
					sequenceNumber,
					updatedFields: Object.keys(delta),
					newPhase: updatedState.phase,
				});
			} catch (error) {
				logger.error("Error in applyGameStateDelta", error, {
					hasDelta: !!delta,
					hasCurrentState: !!get().gameState,
					sequenceNumber,
				});
			}
		},

		handleTurnStarted: (turnStartedAt, turnDurationMs, currentPlayerId) => {
			const currentState = get().gameState;
			if (currentState) {
				set({
					gameState: {
						...currentState,
						turnStartedAt,
						turnDurationMs,
						currentPlayerId,
						phase: "TURN_ACTIVE",
					},
				});
			}
		},

		submitWord: (word, msTaken) => {
			import("../services/bombPartyService").then(
				({ bombPartyService }) => {
					try {
						bombPartyService.submitWord(word, msTaken);
					} catch (err) {
						logger.error(
							"Erreur lors de la soumission du mot",
							err
						);
						get().setLastError(
							"Erreur lors de la soumission du mot"
						);
					}
				}
			);
		},

		activateBonus: (bonusKey) => {
			import("../services/bombPartyService").then(
				({ bombPartyService }) => {
					try {
						bombPartyService.activateBonus(bonusKey);
					} catch (err) {
						logger.error(
							"Erreur lors de l'activation du bonus",
							err
						);
						get().setLastError(
							"Erreur lors de l'activation du bonus"
						);
					}
				}
			);
		},

		joinRoom: (roomId, password) => {
			import("../services/bombPartyService").then(
				({ bombPartyService }) => {
					try {
						bombPartyService.joinRoom(roomId, password);
					} catch (err) {
						logger.error(
							"Erreur lors de la connexion à la room",
							err
						);
						get().setLastError(
							"Erreur lors de la connexion à la room"
						);
					}
				}
			);
		},

		leaveRoom: () => {
			import("../services/bombPartyService").then(
				({ bombPartyService }) => {
					try {
						bombPartyService.leaveRoom();
					} catch (err) {
						logger.error(
							"Erreur lors de la deconnexion de la room",
							err
						);
						get().setLastError(
							"Erreur lors de la deconnexion de la room"
						);
					}
				}
			);
		},

		createRoom: (name, isPrivate, password, maxPlayers = 4) => {
			import("../services/bombPartyService").then(
				({ bombPartyService }) => {
					try {
						bombPartyService.createRoom(
							name,
							isPrivate,
							password,
							maxPlayers
						);
					} catch (err) {
						logger.error(
							"Erreur lors de la creation de la room",
							err
						);
						get().setLastError(
							"Erreur lors de la creation de la room"
						);
					}
				}
			);
		},

		startGame: () => {
			import("../services/bombPartyService").then(
				({ bombPartyService }) => {
					try {
						bombPartyService.startGame();
					} catch (err) {
						logger.error(
							"Erreur lors du demarrage de la partie",
							err
						);
						get().setLastError(
							"Erreur lors du demarrage de la partie"
						);
					}
				}
			);
		},

		setConnectionState: (state) =>
			set((prev) => {
				if (prev.connection.state === state) return prev;
				return { connection: { ...prev.connection, state } };
			}),

		setPlayerId: (playerId) =>
			set((prev) => {
				if (prev.connection.playerId === playerId) return prev;
				return { connection: { ...prev.connection, playerId } };
			}),

		setRoomId: (roomId) =>
			set((prev) => {
				if (prev.connection.roomId === roomId) return prev;
				return { connection: { ...prev.connection, roomId } };
			}),

		setIsHost: (isHost) =>
			set((prev) => {
				if (prev.connection.isHost === isHost) return prev;
				return { connection: { ...prev.connection, isHost } };
			}),

		setLobbyPlayers: (lobbyPlayers) =>
			set((prev) => {
				if (
					prev.connection.lobbyPlayers === lobbyPlayers ||
					(prev.connection.lobbyPlayers.length ===
						lobbyPlayers.length &&
						prev.connection.lobbyPlayers.every(
							(p, i) =>
								p.id === lobbyPlayers[i]?.id &&
								p.name === lobbyPlayers[i]?.name
						))
				) {
					return prev;
				}
				return { connection: { ...prev.connection, lobbyPlayers } };
			}),

		setLobbyMaxPlayers: (lobbyMaxPlayers) =>
			set((prev) => {
				if (prev.connection.lobbyMaxPlayers === lobbyMaxPlayers)
					return prev;
				return { connection: { ...prev.connection, lobbyMaxPlayers } };
			}),

		setIsAuthenticating: (isAuthenticating) =>
			set((prev) => {
				if (prev.connection.isAuthenticating === isAuthenticating)
					return prev;
				return { connection: { ...prev.connection, isAuthenticating } };
			}),

		setReconnectAttempts: (reconnectAttempts) =>
			set((prev) => {
				if (prev.connection.reconnectAttempts === reconnectAttempts)
					return prev;
				return {
					connection: { ...prev.connection, reconnectAttempts },
				};
			}),

		setLastError: (lastError) =>
			set((prev) => {
				if (prev.connection.lastError === lastError) return prev;
				return { connection: { ...prev.connection, lastError } };
			}),

		setWordJustSubmitted: (wordJustSubmitted) =>
			set((prev) => {
				if (prev.ui.wordJustSubmitted === wordJustSubmitted)
					return prev;
				return { ui: { ...prev.ui, wordJustSubmitted } };
			}),

		setTurnInProgress: (turnInProgress) =>
			set((prev) => {
				if (prev.ui.turnInProgress === turnInProgress) return prev;
				return { ui: { ...prev.ui, turnInProgress } };
			}),

		setTimerGracePeriod: (timerGracePeriod) =>
			set((prev) => {
				if (prev.ui.timerGracePeriod === timerGracePeriod) return prev;
				return { ui: { ...prev.ui, timerGracePeriod } };
			}),

		setTimerFlash: (timerFlash) =>
			set((prev) => {
				if (prev.ui.timerFlash === timerFlash) return prev;
				return { ui: { ...prev.ui, timerFlash } };
			}),

		setProfilePlayerId: (profilePlayerId) =>
			set((prev) => {
				if (prev.ui.profilePlayerId === profilePlayerId) return prev;
				return { ui: { ...prev.ui, profilePlayerId } };
			}),

		setInfoOpen: (infoOpen) =>
			set((prev) => {
				if (prev.ui.infoOpen === infoOpen) return prev;
				return { ui: { ...prev.ui, infoOpen } };
			}),

		setLobbies: (lobbies) =>
			set((prev) => {
				if (
					prev.lobbies === lobbies ||
					(prev.lobbies.length === lobbies.length &&
						prev.lobbies.every((l, i) => l.id === lobbies[i]?.id))
				) {
					return prev;
				}
				return { lobbies };
			}),

		requestLobbyList: () => {
			import("../services/bombPartyService").then(
				({ bombPartyService }) => {
					try {
						bombPartyService.requestLobbyList();
					} catch (err) {
						logger.warn(
							"Erreur lors de la requête de la liste des lobbies",
							{ error: err }
						);
					}
				}
			);
		},

		setPlayerNameModalOpen: (playerNameModalOpen) =>
			set((prev) => {
				if (prev.playerNameModalOpen === playerNameModalOpen)
					return prev;
				return { playerNameModalOpen };
			}),

		setGameMode: (gameMode) =>
			set((prev) => {
				if (prev.gameMode === gameMode) return prev;
				return { gameMode };
			}),
		setMultiplayerType: (multiplayerType) =>
			set((prev) => {
				if (prev.multiplayerType === multiplayerType) return prev;
				return { multiplayerType };
			}),
		setCountdown: (countdown) =>
			set((prev) => {
				if (prev.countdown === countdown) return prev;
				return { countdown };
			}),
		setGameStartTime: (gameStartTime) =>
			set((prev) => {
				if (prev.gameStartTime === gameStartTime) return prev;
				return { gameStartTime };
			}),
		setBonusNotification: (bonusNotification) =>
			set((prev) => {
				if (
					prev.bonusNotification === bonusNotification ||
					(prev.bonusNotification?.bonusKey ===
						bonusNotification?.bonusKey &&
						prev.bonusNotification?.playerName ===
							bonusNotification?.playerName)
				) {
					return prev;
				}
				return { bonusNotification };
			}),
		setTurnStartTime: (turnStartTime) => {
			const prev = get();
			if (prev.turnStartTime === turnStartTime) return;

			logger.info("🎯 setTurnStartTime appele", {
				previousTurnStartTime: prev.turnStartTime,
				newTurnStartTime: turnStartTime,
				gameStatePhase: prev.gameState?.phase,
				gameStateTurnStartedAt: prev.gameState?.turnStartedAt,
				currentTime: Date.now(),
				diff:
					prev.turnStartTime > 0
						? turnStartTime - prev.turnStartTime
						: "initial",
				isNewTurn:
					prev.turnStartTime > 0 &&
					prev.turnStartTime !== turnStartTime,
				currentPlayerId: prev.gameState?.currentPlayerId,
			});

			set({ turnStartTime });
		},

		setOptimisticLifeLoss: (
			lifeLoss: { playerId: string; timestamp: number } | null
		) => set({ optimisticLifeLoss: lifeLoss }),

		setUserPreferences: (preferences: Partial<UserPreferences>) => {
			const current = get().userPreferences;
			const updated = { ...current, ...preferences };
			set({ userPreferences: updated });
			savePreferencesToStorage(updated);
		},

		resetUserPreferences: () => {
			set({ userPreferences: defaultPreferences });
			savePreferencesToStorage(defaultPreferences);
		},

		getCurrentPlayer: () => {
			const { gameState } = get();
			if (!gameState || gameState.players.length === 0) return null;
			return gameState.players[gameState.currentPlayerIndex] || null;
		},

		getRemainingTime: () => {
			const { gameState, turnStartTime } = get();
			if (!gameState || gameState.phase !== "TURN_ACTIVE") return 0;

			const now = Date.now();

			let elapsed = 0;
			let source = "unknown";

			if (
				turnStartTime > 0 &&
				Math.abs(turnStartTime - gameState.turnStartedAt) < 1000
			) {
				elapsed = now - turnStartTime;
				source = "turnStartTime";
			} else if (gameState.turnStartedAt > 0) {
				elapsed = now - gameState.turnStartedAt;
				source = "gameState.turnStartedAt";
			} else {
				logger.warn(
					"getRemainingTime - Aucune source de temps valide",
					{
						turnStartTime,
						gameStateTurnStartedAt: gameState.turnStartedAt,
						phase: gameState.phase,
					}
				);
				return 0;
			}

			const remaining = Math.max(0, gameState.turnDurationMs - elapsed);

			if (remaining < 0 || remaining > gameState.turnDurationMs + 2000) {
				logger.warn("getRemainingTime - Calcul suspect", {
					now,
					turnStartTime,
					gameStateTurnStartedAt: gameState.turnStartedAt,
					elapsed,
					turnDurationMs: gameState.turnDurationMs,
					remaining,
					phase: gameState.phase,
					source,
					timeDiff:
						turnStartTime > 0
							? Math.abs(turnStartTime - gameState.turnStartedAt)
							: "N/A",
				});
			}

			return remaining;
		},

		isMyTurn: () => {
			const { gameState, connection } = get();
			if (!gameState || !connection.playerId) return false;
			return gameState.currentPlayerId === connection.playerId;
		},

		canSubmitWord: () => {
			const { gameState, connection, ui } = get();

			if (!gameState) {
				logger.debug("canSubmitWord - No gameState");
				return false;
			}

			if (!connection.playerId) {
				logger.debug("canSubmitWord - No playerId");
				return false;
			}

			if (!connection.roomId) {
				logger.debug("canSubmitWord - No roomId");
				return false;
			}

			if (gameState.phase !== "TURN_ACTIVE") {
				logger.debug("canSubmitWord - Phase not TURN_ACTIVE", {
					phase: gameState.phase,
				});
				return false;
			}

			if (gameState.currentPlayerId !== connection.playerId) {
				logger.debug("canSubmitWord - Not my turn", {
					currentPlayerId: gameState.currentPlayerId,
					myPlayerId: connection.playerId,
				});
				return false;
			}

			if (ui.wordJustSubmitted) {
				logger.debug("canSubmitWord - Word just submitted");
				return false;
			}

			logger.debug("canSubmitWord - Can submit", {
				playerId: connection.playerId,
				currentPlayerId: gameState.currentPlayerId,
				phase: gameState.phase,
			});

			return true;
		},

		applyOptimisticWordSubmit: (word: string) => {
			const { gameState } = get();
			if (!gameState) return;

			const normalizedWord = word.toLowerCase().trim();

			set({
				gameState: {
					...gameState,
					usedWords: [...gameState.usedWords, normalizedWord],
				},
				ui: {
					...get().ui,
					wordJustSubmitted: true,
				},
			});

			logger.debug("Optimistic update applied", { word: normalizedWord });
		},

		revertOptimisticWordSubmit: (word: string) => {
			const { gameState } = get();
			if (!gameState) return;

			const normalizedWord = word.toLowerCase().trim();

			const updatedUsedWords = gameState.usedWords.filter(
				(w) => w !== normalizedWord
			);

			set({
				gameState: {
					...gameState,
					usedWords: updatedUsedWords,
				},
				ui: {
					...get().ui,
					wordJustSubmitted: false,
				},
			});

			logger.debug("Optimistic update reverted", {
				word: normalizedWord,
			});
		},
	}))
);
