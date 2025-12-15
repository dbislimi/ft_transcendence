import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameOverlay from "../pong/GameOverlay";
import GameOverOverlay from "../pong/GameOverOverlay";
import Countdown from "../Components/Countdown";
import SearchingOverlay from "../pong/SearchingOverlay";
import WaitingOverlay from "../pong/WaitingOverlay";
import { ReadyButton } from "../pong/ReadyButton";
import { usePongControls, type PendingInput } from "../hooks/usePongControls";
import PingController from "../pong/PingController";
import BackToMenuButton from "../Components/BackToMenuButton";
import { useTranslation } from "react-i18next";
import { useWebSocket } from "../contexts/WebSocketContext";
import PongRulesScreen from "../pong/PongRulesScreen";
import PongTournamentLobby from "../pong/PongTournamentLobby";
import PongGameArea from "../pong/PongGameArea";
import type { PongState, ServerSnapshot } from "../types/PongState";
import { useUser } from "../contexts/UserContext";
import { useGameSession } from "../contexts/GameSessionContext";
import { useGameSettings } from "../contexts/GameSettingsContext";
import { reconcileWithServer } from "../utils/reconciliation";
import {
	type PlayerLabels,
	type Difficulty,
	getPlayerLabels,
} from "../utils/playerLabels";

type GameOverData = {
	didWin: boolean;
	scores: number[];
	tournamentDepth?: number | null;
	finalTournamentWin?: boolean;
	type?: string;
	opponent?: string;
};

type Ui =
	| { kind: "search" }
	| { kind: "rules" }
	| { kind: "lobby" }
	| { kind: "training" }
	| { kind: "play" }
	| { kind: "wait"; opponentName: string }
	| {
			kind: "ready";
			remaining: number;
			selfReady: boolean;
			opponentReady: boolean;
			opponentName: string;
	  }
	| { kind: "countdown"; value: number }
	| { kind: "result"; gameOver: GameOverData };

const initGameState = (): PongState => ({
	ball: { x: 100, y: 50 },
	players: {
		p1: {
			size: 25,
			y: 37.5,
			score: 0,
			movingUp: false,
			movingDown: false,
			lastProcessedInputId: -1,
		},
		p2: {
			size: 25,
			y: 37.5,
			score: 0,
			movingUp: false,
			movingDown: false,
			lastProcessedInputId: -1,
		},
	},
	bonuses: [],
	timestamp: Date.now(),
	serverUpdates: [],
});

export default function Pong() {
	const { user, isAuthenticated } = useUser();
	const { i18n } = useTranslation();
	const { pongWsRef, addPongRoute, removePongRoute } = useWebSocket();
	const { session, setSession, clearSession } = useGameSession();
	const { bonusEnabled } = useGameSettings();
	const prevAuthRef = useRef(isAuthenticated);
	const trainingDifficultyRef = useRef<Difficulty | null>(null);
	const lastStartPayloadRef = useRef<Record<string, unknown> | null>(null);
	const activeSessionRef = useRef(false);
	const gameRef = useRef<PongState>(initGameState());
	const controlsReadyRef = useRef(false);
	const pendingInputsRefs = useRef<[PendingInput[], PendingInput[]]>([
		[],
		[],
	]);
	const inputIdRefs = useRef<[number, number]>([0, 0]);
	const [view, setView] = useState<Ui>({ kind: "rules" });
	const enableIplusPRef = useRef(true);
	const enableInterpolationRef = useRef(true);
	const shouldMeasurePing = ["play", "ready", "countdown", "wait"].includes(
		view.kind
	);
	const interpolationDelayRef = useRef(100);

	const labels = useMemo((): PlayerLabels => {
		return getPlayerLabels({
			sessionLabels: session?.labels,
			botDifficulty: session?.botDifficulty,
			gameOverOpponent:
				view.kind === "result" ? view.gameOver?.opponent : undefined,
		});
	}, [session, view, i18n.language]);
	const setControlsReady = useCallback((next: boolean) => {
		controlsReadyRef.current = next;
	}, []);
	const isControlsReady = useCallback(() => controlsReadyRef.current, []);

	const sendPongMessage = useCallback(
		(message: any) => {
			pongWsRef.current?.send(JSON.stringify(message));
		},
		[pongWsRef]
	);

	const getPlayer = useCallback((id: number) => {
		return id === 0
			? gameRef.current.players.p1
			: gameRef.current.players.p2;
	}, []);

	const isLocalMode = useMemo(() => {
		return session?.sessionType === "offline" && !session.botDifficulty;
	}, [session?.sessionType, session?.botDifficulty]);

	usePongControls({
		isEnabled: isControlsReady,
		send: sendPongMessage,
		getPlayer,
		pendingInputsRefs,
		inputIdRefs,
		isLocalMode,
	});

	const resetGameState = useCallback(() => {
		gameRef.current = initGameState();
		pendingInputsRefs.current = [[], []];
		inputIdRefs.current = [0, 0];
	}, []);

	const clearTrainingState = useCallback(() => {
		trainingDifficultyRef.current = null;
	}, []);

	const fullReset = useCallback(() => {
		resetGameState();
		setControlsReady(false);
		clearTrainingState();
	}, [resetGameState, setControlsReady, clearTrainingState]);

	const applyTournamentRound = useCallback(
		(body: any) => {
			if (!body) return;
			const depth: number | undefined = body.tournamentDepth;
			if (depth && session)
				setSession({ ...session, tournamentDepth: depth });
		},
		[session, setSession]
	);

	const localStop = useCallback(() => {
		resetGameState();
		setControlsReady(false);
		activeSessionRef.current = false;
		clearSession();
	}, [resetGameState, setControlsReady, clearSession]);

	const getPlayersBySide = (side: number, snapshot: any) => {
		const isP1 = side === 0;
		return {
			me: isP1 ? gameRef.current.players.p1 : gameRef.current.players.p2,
			opponent: isP1
				? gameRef.current.players.p2
				: gameRef.current.players.p1,
			serverMe: isP1 ? snapshot.p1 : snapshot.p2,
			serverOpponent: isP1 ? snapshot.p2 : snapshot.p1,
		};
	};

	const syncPlayerInputs = (playerId: number, lastProcessedId: number) => {
		pendingInputsRefs.current[playerId] = pendingInputsRefs.current[
			playerId
		].filter((input: PendingInput) => input.inputId > lastProcessedId);
	};

	const onMessage = useCallback(
		(data: any) => {
			if (!data) return;

			let remaining;
			switch (data.event) {
				case "searching":
					applyTournamentRound(data.body);
					setView({ kind: "search" });
					break;
				case "waiting":
					const opponentName = data.who;
					fullReset();
					if (
						typeof opponentName === "string" &&
						opponentName.trim().length
					)
						setView({ kind: "wait", opponentName });
					break;
				case "ready_phase":
					remaining = data.body?.remaining;
					const selfReady = data.body?.selfReady ?? false;
					const opponentReady = data.body?.opponentReady ?? false;
					const opponentNameReady = data.body?.opponentName;

					fullReset();

					if (typeof remaining === "number") {
						setView({
							kind: "ready",
							remaining,
							selfReady,
							opponentReady,
							opponentName: opponentNameReady,
						});
					}
					break;
				case "countdown":
					remaining = data.body?.remaining;
					if (
						typeof remaining === "number" &&
						!trainingDifficultyRef.current
					) {
						if (remaining > 0)
							setView({ kind: "countdown", value: remaining });
						else setView({ kind: "play" });
					}
					break;
				case "data":
					setControlsReady(true);
					gameRef.current.serverUpdates.push(data.body);
					gameRef.current.serverUpdates.sort(
						(a: ServerSnapshot, b: ServerSnapshot) =>
							a.timestamp - b.timestamp
					);
					if (gameRef.current.serverUpdates.length > 60)
						gameRef.current.serverUpdates.shift();
					gameRef.current.bonuses = data.body.bonuses;

					if (session?.side !== undefined) {
						const { me, opponent, serverMe, serverOpponent } =
							getPlayersBySide(session.side, data.body.players);

						me.score = serverMe.score;
						me.size = serverMe.size;
						opponent.score = serverOpponent.score;
						opponent.size = serverOpponent.size;

						if (isLocalMode) {
							if (enableIplusPRef.current) {
								reconcileWithServer(
									gameRef.current.players.p1,
									data.body.players.p1,
									data.body.timestamp,
									pendingInputsRefs.current[0]
								);
								reconcileWithServer(
									gameRef.current.players.p2,
									data.body.players.p2,
									data.body.timestamp,
									pendingInputsRefs.current[1]
								);
							}
							syncPlayerInputs(
								0,
								data.body.players.p1.lastProcessedInputId ?? -1
							);
							syncPlayerInputs(
								1,
								data.body.players.p2.lastProcessedInputId ?? -1
							);
						} else {
							if (enableIplusPRef.current) {
								reconcileWithServer(
									me,
									serverMe,
									data.body.timestamp,
									pendingInputsRefs.current[session.side]
								);
							}
							syncPlayerInputs(
								session.side,
								serverMe.lastProcessedInputId ?? -1
							);
						}
					}
					break;
				case "result":
					const type: string = data.body.is;
					const didWin: boolean = data.body.didWin;
					const scores: number[] = data.body.scores;
					const opponentFromResult: string | undefined =
						data.body?.opponent;
					applyTournamentRound(data.body);
					if (trainingDifficultyRef.current) {
						fullReset();
						clearSession();
						setView({ kind: "search" });
						break;
					}
					activeSessionRef.current = false;
					setControlsReady(false);
					const td = data.body.tournamentDepth;
					const isTournamentFinalWin =
						type === "tournament" &&
						didWin === true &&
						td != null &&
						Number(td) === 1;
					setView({
						kind: "result",
						gameOver: {
							didWin,
							scores,
							tournamentDepth: td,
							finalTournamentWin:
								isTournamentFinalWin || undefined,
							type,
							opponent: opponentFromResult,
						},
					});
					break;
				case "error":
					if (data.msg === "tournamentId")
						window.alert(
							"Le nom de tournoi est deja utilisé. Choisissez-en un autre"
						);
					else if (data.msg === "rejoin_active") {
						window.alert(
							"Vous avez une partie de tournoi en attente de reconnexion. Reprenez-la ou attendez la fin du délai."
						);
						setView({ kind: "rules" });
					}
					break;
			}
		},
		[applyTournamentRound, clearSession, pendingInputsRefs]
	);

	useEffect(() => {
		addPongRoute("pong", onMessage);
		return () => removePongRoute("pong", onMessage);
	}, [addPongRoute, removePongRoute, onMessage]);

	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === "b") {
				enableIplusPRef.current = !enableIplusPRef.current;
				console.log(
					`Prediction plus Reconciliation: ${
						enableIplusPRef.current ? "ON" : "OFF"
					}`
				);
			}
			if (e.key.toLowerCase() === "i") {
				enableInterpolationRef.current =
					!enableInterpolationRef.current;
				console.log(
					`Interpolation: ${
						enableInterpolationRef.current ? "ON" : "OFF"
					}`
				);
			}
		};

		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, []);

	useEffect(() => {
		if (!session) return;
		if (
			[
				"play",
				"ready",
				"countdown",
				"result",
				"wait",
				"training",
				"search",
				"lobby",
				"rules",
			].includes(view.kind)
		)
			return;
		fullReset();
		activeSessionRef.current = true;
		if (session.sessionType === "offline") {
			setView({ kind: "play" });
		} else {
			setView({
				kind: "ready",
				remaining: 30,
				selfReady: false,
				opponentReady: false,
				opponentName: session.labels.opponent,
			});
		}
	}, [session, view.kind, fullReset]);

	useEffect(() => {
		if (prevAuthRef.current && !isAuthenticated && view.kind !== "rules") {
			localStop();
			setView({ kind: "rules" });
		}
		prevAuthRef.current = isAuthenticated;
	}, [isAuthenticated, view.kind, localStop]);

	useEffect(() => {
		return () => {
			pongWsRef?.current?.send(
				JSON.stringify({
					event: "stop",
					body: { type: "online" },
				})
			);
			clearSession();
		};
	}, [clearSession]);

	const gameOverData = view.kind === "result" ? view.gameOver : null;

	const stop = useCallback(
		(forceOnline: boolean = false) => {
			const stopType =
				forceOnline ||
				(!trainingDifficultyRef.current &&
					session?.sessionType !== "offline")
					? "online"
					: "offline";
			pongWsRef?.current?.send(
				JSON.stringify({
					event: "stop",
					body: { type: stopType },
				})
			);
			localStop();
		},
		[localStop, pongWsRef, session?.sessionType]
	);

	const sendStartEvent = useCallback(
		(body: Record<string, unknown>) => {
			if (!trainingDifficultyRef.current)
				lastStartPayloadRef.current = body;
			activeSessionRef.current = true;
			pongWsRef.current?.send(JSON.stringify({ event: "start", body }));
		},
		[pongWsRef]
	);

	const handleBackToMenu = useCallback(() => {
		stop(true);
		activeSessionRef.current = false;
		resetGameState();
		clearSession();
		setView({ kind: "rules" });
	}, [stop, clearSession, resetGameState]);

	const handleOnQuitGameover = useCallback(() => {
		resetGameState();
		clearSession();
		if (
			gameOverData &&
			gameOverData.tournamentDepth != null &&
			gameOverData.didWin &&
			!gameOverData.finalTournamentWin
		)
			stop(true);
		else localStop();
		setView({ kind: "rules" });
	}, [localStop, gameOverData, stop, resetGameState, clearSession]);

	const handlePlayerReady = useCallback(() => {
		pongWsRef.current?.send(
			JSON.stringify({
				event: "ready",
				body: { type: "player" },
			})
		);
	}, [pongWsRef]);

	const handleReplayFromOverlay = useCallback(() => {
		const payload = lastStartPayloadRef.current as {
			action?: string;
			diff?: Difficulty | null;
			[k: string]: unknown;
		} | null;
		resetGameState();
		if (
			session?.sessionType === "invite" &&
			session.sessionId &&
			user?.id
		) {
			const [id1, id2] = session.sessionId.split(":").map(Number);
			const opponentId = id1 === user.id ? id2 : id1;
			pongWsRef.current?.send(
				JSON.stringify({
					event: "invitation",
					body: { action: "invite", friendId: opponentId },
				})
			);
			setView({ kind: "rules" });
			return;
		}
		if (payload && payload.action) {
			if (payload.action === "play_offline") {
				sendStartEvent({
					action: "play_offline",
					diff: payload.diff ?? null,
					options: payload.options,
				});
				return;
			}
			sendStartEvent(payload);
			return;
		}
		localStop();
	}, [sendStartEvent, localStop, user, session, pongWsRef]);

	const handleContinueFromOverlay = useCallback(() => {
		activeSessionRef.current = true;
		pongWsRef.current?.send(JSON.stringify({ event: "ready" }));
	}, [pongWsRef]);

	const handleQuitTraining = useCallback(() => {
		pongWsRef.current?.send(
			JSON.stringify({
				event: "stop",
				body: { type: "offline" },
			})
		);
		fullReset();
		clearSession();
		setView({ kind: "search" });
	}, [pongWsRef, fullReset, clearSession]);

	const handleRulesContinue = useCallback(
		(selectedMode: "offline" | "online", config?: any) => {
			if (selectedMode === "offline") {
				const { gamemode, botDiff } = config;
				const diff = gamemode === "solo" ? botDiff : null;
				fullReset();

				sendStartEvent({
					action: "play_offline",
					diff,
					options: { bonus: config.bonus ?? false },
				});
			} else {
				if (config.name) {
					pongWsRef.current?.send(
						JSON.stringify({
							event: "set_name",
							name: config.name,
						})
					);
				}
				if (config.type === "tournament") {
					setView({ kind: "lobby" });
				} else {
					sendStartEvent({ action: "play_online" });
				}
			}
		},
		[sendStartEvent, pongWsRef, fullReset]
	);

	const isSearching = view.kind === "search";
	const isTraining = view.kind === "training";
	const showGameField = [
		"play",
		"ready",
		"countdown",
		"result",
		"wait",
		"training",
	].includes(view.kind);
	const waitingView = view.kind === "wait" ? view : null;
	const readyView = view.kind === "ready" ? view : null;
	const countdownView = view.kind === "countdown" ? view : null;
	return (
		<div className="relative w-screen h-screen flex items-center justify-center">
			<GameOverlay
				play={showGameField || isSearching || isTraining}
				sessionType={
					session?.sessionType === "offline" ? "offline" : "online"
				}
				tournamentDepth={session?.tournamentDepth ?? null}
				isTournament={session?.sessionType === "tournament"}
			/>
			<GameOverOverlay
				gameOver={gameOverData}
				onQuit={handleOnQuitGameover}
				onReplay={handleReplayFromOverlay}
				onContinue={handleContinueFromOverlay}
				side={session?.side ?? 0}
			/>

			{waitingView && showGameField && (
				<WaitingOverlay opponentName={waitingView.opponentName} />
			)}
			{(isSearching ||
				isTraining ||
				(view.kind === "play" &&
					session?.sessionType === "offline")) && (
				<div className="absolute top-4 left-4 z-80">
					<BackToMenuButton onClick={handleBackToMenu} />
				</div>
			)}
			{view.kind === "rules" && (
				<PongRulesScreen onContinue={handleRulesContinue} />
			)}
			{view.kind === "lobby" && (
				<PongTournamentLobby onBack={handleBackToMenu} />
			)}
			{(isSearching || isTraining) && (
				<SearchingOverlay
					training={isTraining}
					onQuit={() => {
						stop();
						clearSession();
						setView({ kind: "rules" });
					}}
					onQuitTraining={handleQuitTraining}
					onTrain={(diff: Difficulty) => {
						fullReset();
						trainingDifficultyRef.current = diff;
						setView({ kind: "training" });
						sendStartEvent({
							action: "play_offline",
							diff,
							options: { bonus: bonusEnabled },
						});
					}}
				/>
			)}
			{readyView && (
				<ReadyButton
					remaining={readyView.remaining}
					selfReady={readyView.selfReady}
					opponentReady={readyView.opponentReady}
					sessionLabels={session?.labels}
					onReady={handlePlayerReady}
				/>
			)}
			{countdownView && <Countdown value={countdownView.value} />}
			{showGameField && (
				<PongGameArea
					labels={labels}
					gameRef={gameRef}
					side={session?.side ?? 0}
					interpolationDelayRef={interpolationDelayRef}
					enableIplusPRef={enableIplusPRef}
					enableInterpolationRef={enableInterpolationRef}
					isLocalMode={isLocalMode}
				/>
			)}
			<PingController
				shouldMeasurePing={shouldMeasurePing}
				interpolationDelayRef={interpolationDelayRef}
			/>
		</div>
	);
}
