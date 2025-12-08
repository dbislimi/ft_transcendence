import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTurnTimer } from "../core/timer";
import { isTimerExpired } from "../core/timerUtils";
import { useUser } from "../../contexts/UserContext";
import RulesScreen from "../RulesScreen";
import { bombPartyService } from "../../services/bombPartyService";
import {
	useBombPartyHooks,
	BombPartyLayout,
	BombPartyLobbyView,
} from "./bombparty";
import { useBombPartyStore } from "../../store/useBombPartyStore";

export default function BombPartyPage() {
	const { user } = useUser();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const serviceInitializedRef = useRef<boolean>(false);

	useEffect(() => {
		if (serviceInitializedRef.current) {
			return;
		}

		bombPartyService.init();
		serviceInitializedRef.current = true;

		return () => {
			const isHotReload =
				import.meta.env?.DEV && import.meta.hot !== undefined;

			if (!isHotReload) {
				bombPartyService.disconnect();
				serviceInitializedRef.current = false;
			}
		};
	}, []);

	useEffect(() => {
		const roomIdFromUrl = searchParams.get("room");
		if (roomIdFromUrl) {
			console.log(
				"[BombPartyPage] Room parameter detected, attempting to join:",
				roomIdFromUrl
			);
			const connection = useBombPartyStore.getState().connection;

			const tryJoin = () => {
				const conn = useBombPartyStore.getState().connection;
				if (conn.state === "connected" && conn.playerId) {
					console.log(
						"[BombPartyPage] Connection ready, subscribing to room:",
						roomIdFromUrl
					);
					bombPartyService.joinRoom(roomIdFromUrl);
				} else {
					console.log(
						"[BombPartyPage] Waiting for connection...",
						conn.state
					);
					setTimeout(tryJoin, 500);
				}
			};

			tryJoin();
		}
	}, [searchParams]);

	const { state, actions, engine, timer, client, handlers } =
		useBombPartyHooks(user);

	const stateRef = useRef(state);
	const actionsRef = useRef(actions);
	const engineRef = useRef(engine);
	const timerRef = useRef(timer);

	useEffect(() => {
		stateRef.current = state;
		actionsRef.current = actions;
		engineRef.current = engine;
		timerRef.current = timer;
	}, [state, actions, engine, timer]);

	// timer unifie pour local et multiplayer
	const isTimerActive = state.gameState.phase === "TURN_ACTIVE";
	const remainingMs = useTurnTimer(timer, isTimerActive);

	// debug temporaire
	useEffect(() => {
		if (isTimerActive && remainingMs === 0) {
			console.warn("[BombPartyPage] Timer actif mais remainingMs = 0", {
				isTimerActive,
				remainingMs,
				gameMode: state.gameMode,
				phase: state.gameState.phase,
				timerIsActive: timer.isTimerActive(),
				turnStartedAt: state.gameState.turnStartedAt,
				turnStartTime: state.turnStartTime,
			});
		}
	}, [
		isTimerActive,
		remainingMs,
		state.gameMode,
		state.gameState.phase,
		state.gameState.turnStartedAt,
		state.turnStartTime,
		timer,
	]);

	useEffect(() => {
		const currentState = stateRef.current;
		const currentActions = actionsRef.current;
		const currentEngine = engineRef.current;
		const currentTimer = timerRef.current;

		const expired = isTimerExpired(
			currentState.gameMode,
			currentState.gameState.phase,
			remainingMs,
			currentState.wordJustSubmitted,
			currentState.turnInProgress,
			currentState.timerGracePeriod,
			currentState.turnStartTime,
			currentState.gameState.turnStartedAt
		);

		if (expired) {
			if (currentState.gameMode === "local") {
				const wordValid = false;
				const timeExpired = true;

				(async () => {
					await currentEngine.resolveTurn(wordValid, timeExpired);
					const newState = currentEngine.getState();

					currentActions.setGameState(newState);

					if (!currentEngine.isGameOver()) {
						const newTurnStart =
							newState.turnStartedAt || Date.now();
						const newTurnDuration =
							newState.turnDurationMs || 15000;

						currentActions.setTurnStartTime(newTurnStart);

						if (currentTimer && newTurnStart && newTurnDuration) {
							currentTimer.startTurn(
								newTurnStart,
								newTurnDuration,
								Date.now()
							);
						}

						currentActions.setTimerGracePeriod(true);
						setTimeout(() => {
							currentActions.setTurnInProgress(false);
							currentActions.setWordJustSubmitted(false);
							currentActions.setTimerGracePeriod(false);
						}, 300);
					}
				})();
			} else {
				const currentPlayer =
					currentState.gameState.players[
						currentState.gameState.currentPlayerIndex
					];
				if (currentPlayer && currentPlayer.id) {
					currentActions.setTimerGracePeriod(true);

					const store = useBombPartyStore.getState();
					store.setOptimisticLifeLoss({
						playerId: currentPlayer.id,
						timestamp: Date.now(),
					});

					const optimisticState = {
						...currentState.gameState,
						players: currentState.gameState.players.map((p: any) =>
							p.id === currentPlayer.id
								? { ...p, lives: Math.max(0, p.lives - 1) }
								: p
						),
					};
					currentActions.setGameState(optimisticState);

					setTimeout(() => {
						currentActions.setTimerGracePeriod(false);
					}, 1000);
				}
			}
		}
	}, [
		remainingMs,
		state.gameState.phase,
		state.wordJustSubmitted,
		state.turnInProgress,
		state.timerGracePeriod,
		state.turnStartTime,
		state.gameMode,
		state.gameState.currentPlayerIndex,
		state.gameState.turnStartedAt,
	]);

	const handlePlayerClick = (id: string) => {
		if (id === "") {
			actions.setProfilePlayerId(null);
		} else {
			actions.setProfilePlayerId(id);
		}
	};

	const handleInfoToggle = () => {
		actions.setInfoOpen(!state.infoOpen);
	};

	const handleBackFromRules = () => {
		navigate("/");
	};

	if (state.gamePhase === "RULES") {
		return (
			<RulesScreen
				onContinue={handlers.handleModeSelect}
				onBack={handleBackFromRules}
			/>
		);
	}

	if (state.gamePhase === "LOBBY" || state.gamePhase === "PLAYERS") {
		return (
			<BombPartyLobbyView
				state={state}
				client={client}
				onLobbyCreate={handlers.handleLobbyCreate}
				onLobbyJoin={handlers.handleLobbyJoin}
				onBackFromLobby={handlers.handleBackFromLobby}
				onLeaveLobby={handlers.handleLeaveLobby}
				onStartGame={handlers.handleStartGame}
			/>
		);
	}

	return (
		<BombPartyLayout
			state={state}
			engine={engine}
			remainingMs={remainingMs}
			isCurrentPlayerTurn={handlers.isCurrentPlayerTurn}
			onWordSubmit={handlers.handleWordSubmit}
			onActivateBonus={handlers.handleActivateBonus}
			onBackToMenu={handlers.handleBackToMenu}
			onPlayerClick={handlePlayerClick}
			onInfoToggle={handleInfoToggle}
			onCloseBonusNotification={handlers.handleCloseBonusNotification}
			gameMode={state.gameMode}
		/>
	);
}
