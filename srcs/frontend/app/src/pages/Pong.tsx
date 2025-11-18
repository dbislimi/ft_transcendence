import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SpaceBackground from "../Components/SpaceBackground";
import GameOverlay from "../Components/GameOverlay";
import GameOverOverlay from "../Components/GameOverOverlay";
import Countdown from "../Components/Countdown";
import SearchingOverlay from "../Components/SearchingOverlay";
import WaitingOverlay from "../Components/WaitingOverlay";
import { ReadyButton } from "../Components/ReadyButton";
import { usePongControls } from "../hooks/usePongControls";
import { OfflineCard } from "../Components/OfflineCard";
import usePongParams from "../hooks/usePongParams";
import BackToMenuButton from "../Components/BackToMenuButton";
import { OnlineCard } from "../Components/OnlineCard";
import { useWebSocket } from "../context/WebSocketContext";
import PongModeSelection from "../Components/PongModeSelection";
import PongGameArea from "../Components/PongGameArea";
import type { GameState } from "../types/GameState";
import type { OfflineConfig } from "../Components/OfflineCard";
import { useUser } from "../context/UserContext";
import { useGameSession } from "../context/GameSessionContext";

type PlayerLabels = {
	self: string;
	opponent: string;
};

type Difficulty = "easy" | "medium" | "hard";

type GameOverData = {
	didWin: boolean;
	scores: number[];
	tournamentDepth?: number | null;
	finalTournamentWin?: boolean;
	type?: string;
	opponent?: string;
};

type Ui =
	| { kind: "menu" }
	| { kind: "search" }
	| { kind: "training" }
	| { kind: "play" }
	| { kind: "wait"; opponentName: string }
	| {
			kind: "ready";
			remaining: number;
			selfReady: boolean;
			opponentReady: boolean;
	  }
	| { kind: "countdown"; value: number }
	| { kind: "result"; gameOver: GameOverData };

const PLAYER_LABELS = {
	self: "You",
	opponent: "Opponent",
} as const;

const SCALE = 4;

const initGameState = (): GameState => ({
	ball: { radius: 100 / 70, x: 100, y: 50, speed: 0 },
	players: {
		p1: { size: 25, y: 37.5, score: 0 },
		p2: { size: 25, y: 37.5, score: 0 },
	},
	bonuses: { count: 0, bonuses: [] },
});

export default function Pong() {
	const { user } = useUser();
	const { pongWsRef, addPongRoute, removePongRoute } = useWebSocket();
	const { session, setSession, clearSession } = useGameSession();
	const { mode, setParams } = usePongParams();

	const trainingRef = useRef(false);
	const trainingLabelsRef = useRef<PlayerLabels | null>(null);
	const lastStartPayloadRef = useRef<Record<string, unknown> | null>(null);
	const activeSessionRef = useRef(false);
	const gameRef = useRef<GameState>(initGameState());
	const controlsReadyRef = useRef(false);
	const sessionMetaRef = useRef<{
		sessionType: "offline" | "online" | null;
		isTournament: boolean;
		tournamentDepth: number | null;
	}>({ sessionType: null, isTournament: false, tournamentDepth: null });

	const [view, setView] = useState<Ui>({ kind: "menu" });

	const labels = useMemo((): PlayerLabels => {
		if (view.kind === "training" && trainingLabelsRef.current)
			return trainingLabelsRef.current;
		if (session?.labels) return session.labels;
		const defaultSelf = user?.name
			? `${user.name} (You)`
			: PLAYER_LABELS.self;
		return { self: defaultSelf, opponent: PLAYER_LABELS.opponent };
	}, [session, user, view.kind]);

	const setControlsReady = useCallback((next: boolean) => {
		controlsReadyRef.current = next;
	}, []);
	const isControlsReady = useCallback(() => controlsReadyRef.current, []);
	const resetGameState = useCallback(() => {
		gameRef.current = initGameState();
	}, []);

	const applyTournamentRound = useCallback((body: any) => {
		if (!body) return;
		const depth: number | undefined = body.tournamentDepth;
		if (depth) sessionMetaRef.current.tournamentDepth = depth;
	}, []);

	const localStop = useCallback(() => {
		resetGameState();
		setControlsReady(false);
		sessionMetaRef.current.tournamentDepth = null;
		sessionMetaRef.current.isTournament = false;
		activeSessionRef.current = false;
		clearSession();
	}, [resetGameState, setControlsReady, clearSession]);

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
					trainingRef.current = false;
					trainingLabelsRef.current = null;
					resetGameState();
					setControlsReady(false);
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
					trainingRef.current = false;
					trainingLabelsRef.current = null;
					resetGameState();
					if (typeof remaining === "number") {
						setView({
							kind: "ready",
							remaining,
							selfReady,
							opponentReady,
						});
					}
					break;
				case "countdown":
					remaining = data.body?.remaining;
					if (typeof remaining === "number" && !trainingRef.current) {
						if (remaining > 0)
							setView({ kind: "countdown", value: remaining });
						else setView({ kind: "play" });
					}
					break;
				case "data":
					setControlsReady(true);
					gameRef.current.ball = data.body.ball;
					gameRef.current.players = data.body.players;
					gameRef.current.bonuses = data.body.bonuses;
					break;
				case "result":
					const type: string = data.body.is;
					const didWin: boolean = data.body.didWin;
					const scores: number[] = data.body.scores;
					const opponentFromResult: string | undefined =
						data.body?.opponent;
					applyTournamentRound(data.body);
					if (trainingRef.current) {
						trainingRef.current = false;
						trainingLabelsRef.current = null;
						resetGameState();
						setControlsReady(false);
						setView({ kind: "search" });
						break;
					}
					activeSessionRef.current = false;
					const td = sessionMetaRef.current.tournamentDepth;
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
					clearSession();
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
						setView({ kind: "menu" });
					}
					break;
			}
		},
		[applyTournamentRound, clearSession]
	);

	useEffect(() => {
		addPongRoute("pong", onMessage);
		return () => removePongRoute("pong", onMessage);
	}, [addPongRoute, removePongRoute, onMessage]);

	useEffect(() => {
		if (!session) return;
		if (
			["play", "ready", "countdown", "result", "wait"].includes(view.kind)
		)
			return;
		resetGameState();
		setControlsReady(false);
		activeSessionRef.current = true;
		setParams({
			mode: session.sessionType === "offline" ? "offline" : "online",
		});
	}, [session, view.kind, setParams, resetGameState, setControlsReady]);

	useEffect(() => {
		if (!mode && view.kind !== "menu") stop();
	}, [mode, view.kind]);

	useEffect(() => {
		return () =>
			pongWsRef?.current?.send(
				JSON.stringify({
					event: "stop",
					body: { type: "online" },
				})
			);
	}, []);

	const gameOverData = view.kind === "result" ? view.gameOver : null;

	const stop = useCallback(
		(forceOnline: boolean = false) => {
			const stopType =
				forceOnline ||
				(!trainingRef.current &&
					!(sessionMetaRef.current.sessionType === "offline"))
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
		[localStop, pongWsRef]
	);

	const sendStartEvent = useCallback(
		(body: Record<string, unknown>) => {
			if (!trainingRef.current) lastStartPayloadRef.current = body;
			activeSessionRef.current = true;
			pongWsRef.current?.send(JSON.stringify({ event: "start", body }));
		},
		[pongWsRef]
	);

	const handleBackToMenu = useCallback(() => {
		stop(true);
		setParams(mode ? { mode } : null);
		sessionMetaRef.current.sessionType = mode as
			| "offline"
			| "online"
			| null;
		sessionMetaRef.current.isTournament = false;
		activeSessionRef.current = false;
		resetGameState();
		clearSession();
		setView({ kind: "menu" });
	}, [mode, stop, setParams, clearSession, resetGameState]);

	const handleOnQuitGameover = useCallback(() => {
		resetGameState();
		clearSession();
		if (
			gameOverData &&
			gameOverData.tournamentDepth != null &&
			gameOverData.didWin &&
			!gameOverData.finalTournamentWin
		) {
			stop(true);
			return;
		}
		localStop();
		setView({ kind: "menu" });
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
		if (payload && payload.action) {
			if (payload.action === "play_offline") {
				const diff = payload.diff ?? null;
				const offlineLabels: PlayerLabels = diff
					? {
							self: user?.name
								? `${user.name} (You)`
								: PLAYER_LABELS.self,
							opponent: `Bot (${
								diff.charAt(0).toUpperCase() + diff.slice(1)
							})`,
					  }
					: { self: "Player 1", opponent: "Player 2" };
				setSession({
					sessionType: "offline",
					opponent: offlineLabels.opponent,
					self: offlineLabels.self,
					side: null,
					labels: offlineLabels,
				});
				resetGameState();
				setControlsReady(false);
				activeSessionRef.current = true;
				sendStartEvent({ action: "play_offline", diff });
				return;
			}
			sendStartEvent(payload);
			return;
		}
		localStop();
	}, [
		sendStartEvent,
		resetGameState,
		setControlsReady,
		localStop,
		user,
		setSession,
	]);

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
		trainingRef.current = false;
		trainingLabelsRef.current = null;
		setView({ kind: "search" });
		resetGameState();
		setControlsReady(false);
	}, [pongWsRef, resetGameState, setControlsReady]);

	const handleOnlineConfirm = useCallback(
		(
			selectedMode: string,
			matchType: string,
			size: number,
			id: string,
			passwd: string
		) => {
			setParams({ mode: "online" });
			sessionMetaRef.current.sessionType = "online";
			sessionMetaRef.current.isTournament = selectedMode === "Tournament";
			if (selectedMode === "Tournament") {
				pongWsRef.current?.send(
					JSON.stringify({
						event: "tournament",
						body: {
							action: matchType.toLowerCase(),
							id,
							size,
							passwd,
						},
					})
				);
			} else {
				sendStartEvent({ action: "play_online" });
			}
		},
		[sendStartEvent, setParams, pongWsRef]
	);

	const handleOfflineConfirm = useCallback(
		({ gamemode, botDiff }: OfflineConfig) => {
			setParams({ mode: "offline" });
			sessionMetaRef.current.sessionType = "offline";

			const diff = gamemode === "solo" ? botDiff : null;
			const offlineLabels: PlayerLabels = diff
				? {
						self: user?.name
							? `${user.name} (You)`
							: PLAYER_LABELS.self,
						opponent: `Bot (${
							diff.charAt(0).toUpperCase() + diff.slice(1)
						})`,
				  }
				: { self: "Player 1", opponent: "Player 2" };
			setSession({
				sessionType: "offline",
				opponent: offlineLabels.opponent,
				self: offlineLabels.self,
				side: null,
				labels: offlineLabels,
			});
			resetGameState();
			setControlsReady(false);
			activeSessionRef.current = true;
			sendStartEvent({ action: "play_offline", diff });
		},
		[
			setParams,
			user,
			setSession,
			resetGameState,
			setControlsReady,
			sendStartEvent,
		]
	);

	usePongControls({
		isEnabled: isControlsReady,
		send: (payload) => pongWsRef.current?.send(JSON.stringify(payload)),
	});

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
			<SpaceBackground />
			<GameOverlay
				play={showGameField || isSearching || isTraining}
				sessionType={sessionMetaRef.current.sessionType}
				tournamentDepth={sessionMetaRef.current.tournamentDepth}
				isTournament={sessionMetaRef.current.isTournament}
			/>
			<GameOverOverlay
				gameOver={gameOverData}
				onQuit={handleOnQuitGameover}
				onReplay={handleReplayFromOverlay}
				onContinue={handleContinueFromOverlay}
			/>
			{waitingView && showGameField && (
				<WaitingOverlay opponentName={waitingView.opponentName} />
			)}
			{(isSearching || isTraining) && (
				<div className="absolute top-4 left-4 z-50">
					<BackToMenuButton onClick={handleBackToMenu} />
				</div>
			)}
			{view.kind === "menu" && !mode && (
				<PongModeSelection
					onSelect={(nextMode) => setParams({ mode: nextMode })}
				/>
			)}
			{mode === "offline" && view.kind === "menu" && (
				<OfflineCard
					onCancel={() => {
						setParams(null);
						sessionMetaRef.current.sessionType = null;
					}}
					onConfirm={handleOfflineConfirm}
				/>
			)}
			{mode === "online" && view.kind === "menu" && (
				<OnlineCard
					onCancel={() => {
						setParams(null);
						sessionMetaRef.current.sessionType = null;
						sessionMetaRef.current.isTournament = false;
					}}
					onConfirm={handleOnlineConfirm}
				/>
			)}
			{(isSearching || isTraining) && (
				<SearchingOverlay
					training={isTraining}
					onQuit={() => {
						stop();
						clearSession();
						setParams({ mode: "online" });
						setView({ kind: "menu" });
					}}
					onQuitTraining={handleQuitTraining}
					onTrain={(diff: Difficulty) => {
						trainingRef.current = true;
						setView({ kind: "training" });
						sendStartEvent({
							action: "play_offline",
							diff,
							skipCountdown: true,
						});
						trainingLabelsRef.current = {
							self: user?.name
								? `${user.name} (You)`
								: PLAYER_LABELS.self,
							opponent: `Bot (${
								diff.charAt(0).toUpperCase() + diff.slice(1)
							})`,
						};
					}}
				/>
			)}
			{readyView && (
				<ReadyButton
					remaining={readyView.remaining}
					selfReady={readyView.selfReady}
					opponentReady={readyView.opponentReady}
					onReady={handlePlayerReady}
				/>
			)}
			{countdownView && <Countdown value={countdownView.value} />}
			{showGameField && (
				<PongGameArea labels={labels} gameRef={gameRef} scale={SCALE} />
			)}
		</div>
	);
}
