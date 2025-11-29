import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SpaceBackground from "../Components/SpaceBackground";
import GameOverlay from "../pong/GameOverlay";
import GameOverOverlay from "../pong/GameOverOverlay";
import Countdown from "../Components/Countdown";
import SearchingOverlay from "../pong/SearchingOverlay";
import WaitingOverlay from "../Components/WaitingOverlay";
import { ReadyButton } from "../pong/ReadyButton";
import { usePongControls } from "../hooks/usePongControls";
import BackToMenuButton from "../Components/BackToMenuButton";
import { useWebSocket } from "../context/WebSocketContext";
import PongRulesScreen from "../pong/PongRulesScreen";
import PongTournamentLobby from "../pong/PongTournamentLobby";
import PongGameArea from "../pong/PongGameArea";
import ActionButton from "../Components/ActionButton";
import { SettingsCard } from "../pong/SettingsCard";
import type { GameState } from "../types/GameState";

import { useUser } from "../context/UserContext";
import { useGameSession } from "../context/GameSessionContext";
import { useGameSettings } from "../context/GameSettingsContext";

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
	| { kind: "rules" }
	| { kind: "lobby" }
	| { kind: "menu" } // Keeping menu for fallback or transition, but rules is the main entry
	| { kind: "search" }
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
	| { kind: "result"; gameOver: GameOverData }
	| { kind: "settings" };

const PLAYER_LABELS = {
	self: "You",
	opponent: "Opponent",
} as const;

const SCALE = 4;

const initGameState = (): GameState => ({
	ball: { radius: 100 / 70, x: 100, y: 50 },
	players: {
		p1: { size: 25, y: 37.5, score: 0 },
		p2: { size: 25, y: 37.5, score: 0 },
	},
	bonuses: { count: 0, bonuses: [] },
});

export default function Pong() {
	const { user, isAuthenticated } = useUser();
	const { pongWsRef, addPongRoute, removePongRoute } = useWebSocket();
	const { session, setSession, clearSession } = useGameSession();

	const prevAuthRef = useRef(isAuthenticated);
	const trainingRef = useRef(false);
	const trainingLabelsRef = useRef<PlayerLabels | null>(null);
	const lastStartPayloadRef = useRef<Record<string, unknown> | null>(null);
	const activeSessionRef = useRef(false);
	const gameRef = useRef<GameState>(initGameState());
	const controlsReadyRef = useRef(false);
	const wsRetryIntervalRef = useRef<NodeJS.Timeout | null>(null);

	const [view, setView] = useState<Ui>({ kind: "rules" });

	const { settings: gameSettings, updateSettings } = useGameSettings();

	const cosmetics = user?.cosmetics || {
		preferredSide: "left",
		paddleColor: "White",
		ballColor: "Rose",
	};

	const labels = useMemo((): PlayerLabels => {
		console.log(
			`Labels: ${view.kind}, ${view.kind === "result" && view.gameOver?.opponent
			}`
		);
		const userName = user?.display_name || user?.name;
		const defaultSelf = userName && userName.trim()
			? `${userName} (You)`
			: PLAYER_LABELS.self;
		if (view.kind === "training" && trainingLabelsRef.current)
			return trainingLabelsRef.current;
		if (view.kind === "result") {
			const self = session?.labels?.self || defaultSelf;
			const opponent =
				view.gameOver?.opponent ||
				session?.labels?.opponent ||
				PLAYER_LABELS.opponent;
			console.log(`OPPONENT: ${opponent}`);
			return { self, opponent };
		}
		if (session?.labels) return session.labels;
		return { self: defaultSelf, opponent: PLAYER_LABELS.opponent };
	}, [session, user, view.kind, view]);

	const setControlsReady = useCallback((next: boolean) => {
		controlsReadyRef.current = next;
	}, []);
	const isControlsReady = useCallback(() => controlsReadyRef.current, []);
	const resetGameState = useCallback(() => {
		gameRef.current = initGameState();
	}, []);

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
					const opponentNameReady = data.body?.opponentName;
					trainingRef.current = false;
					trainingLabelsRef.current = null;
					resetGameState();
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
					const td = session?.tournamentDepth;
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
							"Le nom de tournoi est deja utilise. Choisissez-en un autre"
						);
					else if (data.msg === "rejoin_active") {
						window.alert(
							"Vous avez une partie de tournoi en attente de reconnexion. Reprenez-la ou attendez la fin du delai."
						);
						setView({ kind: "rules" });
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
	}, [session, view.kind, resetGameState, setControlsReady]);

	useEffect(() => {
		if (prevAuthRef.current && !isAuthenticated && view.kind !== "rules") {
			localStop();
			setView({ kind: "rules" });
		}
		prevAuthRef.current = isAuthenticated;
	}, [isAuthenticated, view.kind, localStop]);

	useEffect(() => {
		return () => {
			// Clear any pending retry interval
			if (wsRetryIntervalRef.current) {
				clearInterval(wsRetryIntervalRef.current);
				wsRetryIntervalRef.current = null;
			}
			
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
					(!trainingRef.current && session?.sessionType !== "offline")
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
			if (!trainingRef.current) lastStartPayloadRef.current = body;
			activeSessionRef.current = true;
			
			// Clear any existing retry interval
			if (wsRetryIntervalRef.current) {
				clearInterval(wsRetryIntervalRef.current);
				wsRetryIntervalRef.current = null;
			}
			
			const trySend = () => {
				if (pongWsRef.current?.readyState === WebSocket.OPEN) {
					pongWsRef.current.send(JSON.stringify({ event: "start", body }));
					console.log("[Pong] Start event sent:", body.action);
					return true;
				}
				return false;
			};

			// Try to send immediately
			if (trySend()) return;

			// If not ready, wait for connection with retry mechanism
			console.log("[Pong] WebSocket not ready (state:", pongWsRef.current?.readyState, "), waiting for connection...");
			let attempts = 0;
			const maxAttempts = 20; // 20 attempts * 100ms = 2 seconds max
			
			wsRetryIntervalRef.current = setInterval(() => {
				attempts++;
				if (trySend()) {
					console.log("[Pong] WebSocket connected after", attempts * 100, "ms, event sent successfully");
					if (wsRetryIntervalRef.current) {
						clearInterval(wsRetryIntervalRef.current);
						wsRetryIntervalRef.current = null;
					}
				} else if (attempts >= maxAttempts) {
					console.error("[Pong] WebSocket connection timeout after 2 seconds. Current state:", pongWsRef.current?.readyState);
					if (wsRetryIntervalRef.current) {
						clearInterval(wsRetryIntervalRef.current);
						wsRetryIntervalRef.current = null;
					}
					// Try to show error to user
					window.alert("Erreur: Impossible de se connecter au serveur de jeu. Veuillez réessayer.");
					setView({ kind: "rules" });
				}
			}, 100);
		},
		[pongWsRef, setView]
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
		console.log(
			`session.sessionType: ${session?.sessionType}, session.sessionId: ${session?.sessionId}, user.id: ${user?.id}`
		);
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
			console.log("PAYLOAAAADD");
			if (payload.action === "play_offline") {
				const diff = payload.diff ?? null;
				const userName = user?.display_name || user?.name;
				const offlineLabels: PlayerLabels = diff
					? {
						self: userName && userName.trim()
							? `${userName} (You)`
							: PLAYER_LABELS.self,
						opponent: `Bot (${diff.charAt(0).toUpperCase() + diff.slice(1)
							})`,
					}
					: { self: "Player 1", opponent: "Player 2" };
				setSession({
					sessionType: "offline",
					side: null,
					labels: offlineLabels,
				});
				resetGameState();
				setControlsReady(false);
				activeSessionRef.current = true;
				sendStartEvent({
					action: "play_offline",
					diff,
					options: payload.options,
				});
				setView({ kind: "play" });
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
		session,
		pongWsRef,
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

	const handleRulesContinue = useCallback(
		(selectedMode: "offline" | "online", config?: any) => {
			if (selectedMode === "offline") {
				const { gamemode, botDiff } = config;

				const diff = gamemode === "solo" ? botDiff : null;
				const userName = user?.display_name || user?.name;
				const offlineLabels: PlayerLabels = diff
					? {
						self: userName && userName.trim()
							? `${userName} (You)`
							: PLAYER_LABELS.self,
						opponent: `Bot (${diff.charAt(0).toUpperCase() + diff.slice(1)
							})`,
					}
					: { self: "Player 1", opponent: "Player 2" };
				setSession({
					sessionType: "offline",
					side: 0,
					labels: offlineLabels,
				});
				resetGameState();
				setControlsReady(false);
				activeSessionRef.current = true;
				sendStartEvent({
					action: "play_offline",
					diff,
					options: gameSettings,
				});
				setView({ kind: "play" });
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
		[
			user,
			setSession,
			resetGameState,
			setControlsReady,
			sendStartEvent,
			isAuthenticated,
			pongWsRef,
			gameSettings,
		]
	);

	usePongControls({
		isEnabled: isControlsReady,
		send: (payload) => pongWsRef.current?.send(JSON.stringify(payload)),
		preferredSide: cosmetics.preferredSide,
		side: session?.side ?? null,
	});

	console.log(`view: ${view.kind}`);
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
				preferredSide={cosmetics.preferredSide}
				side={session?.side ?? 0}
			/>
			{waitingView && showGameField && (
				<WaitingOverlay
					onQuit={handleBackToMenu}
					onTrain={(d) => console.log("Training not implemented yet", d)}
				/>
			)}
			{(isSearching ||
				isTraining ||
				(view.kind === "play" &&
					session?.sessionType === "offline")) && (
					<div className="absolute top-4 left-4 z-50">
						<BackToMenuButton onClick={handleBackToMenu} />
					</div>
				)}
			{view.kind === "rules" && (
				<PongRulesScreen
					onContinue={handleRulesContinue}
					onBack={() => (window.location.href = "/")}
					onSettings={() => setView({ kind: "settings" })}
				/>
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
						trainingRef.current = true;
						setView({ kind: "training" });
						sendStartEvent({
							action: "play_offline",
							diff,
							options: gameSettings,
						});
						const userName = user?.display_name || user?.name;
						trainingLabelsRef.current = {
							self: userName && userName.trim()
								? `${userName} (You)`
								: PLAYER_LABELS.self,
							opponent: `Bot (${diff.charAt(0).toUpperCase() + diff.slice(1)
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
					sessionLabels={session?.labels}
					onReady={handlePlayerReady}
				/>
			)}
			{countdownView && <Countdown value={countdownView.value} />}
			{showGameField && (
				<PongGameArea
					labels={labels}
					gameRef={gameRef}
					scale={SCALE}
					cosmetics={cosmetics}
					opponentPaddleColor={session?.opponentPaddleColor}
					side={session?.side ?? 0}
				/>
			)}
			{view.kind === "settings" && (
				<SettingsCard
					onCancel={() => setView({ kind: "rules" })}
					cosmetics={cosmetics}
					onUpdateCosmetics={() => { }}
					onUpdateGameSettings={updateSettings}
				/>
			)}
		</div>
	);
}
