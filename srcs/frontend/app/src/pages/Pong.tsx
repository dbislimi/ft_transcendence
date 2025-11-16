import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chat from "../Components/Chat";
import SpaceBackground from "../Components/SpaceBackground";
import GameOverlay from "../Components/GameOverlay";
import GameOverOverlay from "../Components/GameOverOverlay";
import Countdown from "../Components/Countdown";
import WaitingOverlay from "../Components/WaitingOverlay";
import { usePongControls } from "../hooks/usePongControls";
import { OfflineCard } from "../Components/OfflineCard";
import usePongParams from "../hooks/usePongParams";
import BackToMenuButton from "../Components/BackToMenuButton";
import { OnlineCard } from "../Components/OnlineCard";
import { useGameWebsocket } from "../hooks/useGameWebsocket";
import PongModeSelection from "../Components/PongModeSelection";
import PongGameArea from "../Components/PongGameArea";
import type { GameState } from "../types/GameState";
import type { OfflineConfig } from "../Components/OfflineCard";
import { useAuth } from "../contexts/AuthContext";

type CountdownState =
	| { mode: "remote"; value: number }
	| { mode: "local"; seconds: number }
	| null;

type PlayerLabels = {
	self: string;
	opponent: string;
};

type Difficulty = "easy" | "medium" | "hard";

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
	const { user } = useAuth();

	const defaultSelfLabel = useMemo(
		() => (user?.name ? `${user.name} (You)` : PLAYER_LABELS.self),
		[user]
	);
	const getDefaultLabels = useCallback(
		(): PlayerLabels => ({
			self: defaultSelfLabel,
			opponent: PLAYER_LABELS.opponent,
		}),
		[defaultSelfLabel]
	);
	const [play, setPlay] = useState(false);
	const [countdownState, setCountdownState] = useState<CountdownState>(null);

	const lastOfflineDiffRef = useRef<Difficulty | null>(null);
	const [labels, setLabels] = useState<PlayerLabels>(() =>
		getDefaultLabels()
	);
	const [waiting, setWaiting] = useState(false);
	const trainingRef = useRef(false);
	const tournamentRoundRef = useRef<{
		depth?: number;
		initialDepth?: number;
	} | null>(null);

	const autoContinueTimeoutRef = useRef<number | null>(null);
	const { mode, setParams } = usePongParams();

	const sessionTypeRef = useRef<"offline" | "online" | null>(null);

	const lastStartPayloadRef = useRef<Record<string, unknown> | null>(null);

	type GameOverState = {
		didWin: boolean;
		scores: number[];
		tournamentRound?: { depth?: number; initialDepth?: number } | null;
		finalTournamentWin?: boolean;
		type?: string;
	} | null;

	const [gameOver, setGameOver] = useState<GameOverState>(null);

	const gameRef = useRef<GameState>(initGameState());
	const offlinePayloadRef = useRef<{ diff: Difficulty | null } | null>(null);
	const [controlsReady, setControlsReadyState] = useState(false);
	const setControlsReady = useCallback((next: boolean) => {
		setControlsReadyState(next);
	}, []);

	const resetGameState = useCallback(() => {
		gameRef.current = initGameState();
	}, []);

	const resetLabels = useCallback(() => {
		setLabels(getDefaultLabels());
	}, [getDefaultLabels]);

	const localStop = useCallback(() => {
		resetGameState();
		offlinePayloadRef.current = null;
		setCountdownState(null);
		setControlsReady(false);
		resetLabels();
		tournamentRoundRef.current = null;
		setPlay(false);
	}, [resetGameState, resetLabels, setControlsReady]);

	const localStart = useCallback(() => {
		resetGameState();
		resetLabels();
		setControlsReady(false);
		setWaiting(false);
		setPlay(true);
	}, [resetGameState, setControlsReady]);

	const onMessage = useCallback(
		(event: MessageEvent) => {
			const data = JSON.parse(event.data);
			if (!data) return;
			console.log(`data: ${data.event}`);
			switch (data.event) {
				case "searching": {
					console.log("searching");
					setWaiting(true);
					setCountdownState(null);
					setControlsReady(false);
					setPlay(false);
					break;
				}
				case "found": {
					console.log("found");
					trainingRef.current = false;
					localStart();
					break;
				}
				case "players": {
					const opponentLabel = data.body?.opponent;
					setLabels((prev) => ({
						...prev,
						opponent:
							typeof opponentLabel === "string" &&
							opponentLabel.trim().length
								? opponentLabel
								: prev.opponent,
					}));
					break;
				}
				case "countdown": {
					const remaining = data.body?.remaining;
					if (typeof remaining === "number") {
						if (remaining > 0) {
							setCountdownState({
								mode: "remote",
								value: remaining,
						});
					} else {
						setCountdownState(null);
							if (!play) {
								localStart();
							}
						}
					}
					setControlsReady(false);
					break;
				}
				case "data":
					if (!play) break;
					setControlsReady(true);
					gameRef.current.ball = data.body.ball;
					gameRef.current.players = data.body.players;
					gameRef.current.bonuses = data.body.bonuses || { count: 0, bonuses: [] };
					break;
				case "result": {
					const type: string = data.body.is;
					const didWin: boolean = data.body.didWin;
					const scores: number[] = data.body.scores;
					if (trainingRef.current) {
						trainingRef.current = false;
					} else {
						setGameOver({
							didWin,
							scores,
							tournamentRound: tournamentRoundRef.current,
							type,
						});
					}
					setControlsReady(false);
					setCountdownState(null);
					break;
				}
				case "tournament_win": {
					setControlsReady(false);
					setCountdownState(null);
					setGameOver({
						didWin: true,
						scores: data.body?.scores ?? [],
						finalTournamentWin: true,
					});

					tournamentRoundRef.current = null;

					break;
				}
				case "tournament_round": {
					const depth = data.body?.depth;
					const initialDepth = data.body?.initialDepth;
					if (typeof depth === "number") {
						tournamentRoundRef.current = { depth, initialDepth };
					}
					break;
				}

				case "error":
					if (data.msg === "tournamentId")
						window.alert(
							"Le nom de tournoi est deja utilisé. Choisissez-en un autre"
						);
					break;
			}
		},
		[
			play,
			resetLabels,
			setControlsReady,
			labels.opponent,
			defaultSelfLabel,
			setPlay,
			localStart,
		]
	);

	const wsRef = useGameWebsocket("game", onMessage);

	const stop = useCallback(
		(forceOnline: boolean = false) => {
			console.log(
				`training=${trainingRef.current}, mode=${sessionTypeRef.current}, forceOnline=${forceOnline}`
			);
			const stop =
				forceOnline ||
				(!trainingRef.current &&
					!(sessionTypeRef.current === "offline"))
					? "stop_online"
					: "stop_offline";
			console.log(`stop: ${stop}`);
			wsRef?.current?.send(JSON.stringify({ event: stop }));
			localStop();
		},
		[localStop, wsRef]
	);

	const handleBackToMenu = useCallback(() => {
		setGameOver(null);
		stop(true);
		setParams(mode ? { mode } : null);
		sessionTypeRef.current = mode as "offline" | "online" | null;
	}, [mode, stop, setParams]);

	const handleOnQuitGameover = useCallback(() => {
		setGameOver(null);
		localStop();
	}, [localStop]);

	const sendStartEvent = useCallback(
		(body: Record<string, unknown>) => {
			if (!trainingRef.current) {
				lastStartPayloadRef.current = body;
			}

			const ws = wsRef.current;
			const payload = JSON.stringify({ event: "start", body });

			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(payload);
				return;
			}

			console.warn("[Pong] WS not open yet, queueing start event until open");
			let done = false;
			const onOpen = () => {
				if (done) return;
				done = true;
				try {
					wsRef.current?.send(payload);
				} catch (e) {
					console.error("[Pong] Failed to send start after open:", e);
				} finally {
					wsRef.current?.removeEventListener?.("open", onOpen as any);
				}
			};
			wsRef.current?.addEventListener?.("open", onOpen as any);
			setTimeout(() => {
				if (done) return;
				if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
					onOpen();
				} else {
					console.error("[Pong] WS still not open; start event not sent");
				}
			}, 2000);
		},
		[wsRef]
	);

	const handleReplayFromOverlay = useCallback(() => {
		const payload = lastStartPayloadRef.current;
		setGameOver(null);
		if (payload) {
			sendStartEvent(payload as Record<string, unknown>);
			localStart();
			return;
		}
		localStop();
	}, [sendStartEvent, localStart, localStop]);

	const handleContinueFromOverlay = useCallback(() => {
		if (autoContinueTimeoutRef.current) {
			clearTimeout(autoContinueTimeoutRef.current);
			autoContinueTimeoutRef.current = null;
		}

		setGameOver(null);
		wsRef.current?.send(JSON.stringify({ event: "ready" }));
		setWaiting(true);
		setPlay(false);
		setControlsReady(false);
		setCountdownState(null);
	}, [wsRef]);

	useEffect(() => {
		if (
			gameOver &&
			gameOver.tournamentRound &&
			!gameOver.finalTournamentWin &&
			gameOver.didWin
		) {
			const id = window.setTimeout(() => {
				handleContinueFromOverlay();
				autoContinueTimeoutRef.current = null;
			}, 5000);
			autoContinueTimeoutRef.current = id;
			return () => {
				if (autoContinueTimeoutRef.current) {
					clearTimeout(autoContinueTimeoutRef.current);
					autoContinueTimeoutRef.current = null;
				}
			};
		}
		return;
	}, [gameOver, handleContinueFromOverlay]);

	const handleOnlineConfirm = useCallback(
		(
			selectedMode: string,
			matchType: string,
			size: number,
			id: string,
			passwd: string
		) => {
			if (selectedMode === "Tournament") {
				setParams({ mode: "online", id });
				sessionTypeRef.current = "online";
				sendStartEvent({
					action: `${matchType.toLowerCase()}_tournament`,
					id,
					size,
					passwd,
				});
			} else {
				setParams({ mode: "online" });
				sessionTypeRef.current = "online";
				sendStartEvent({ action: "play_online" });
			}
			resetLabels();
		},
		[sendStartEvent, resetLabels, setParams]
	);

	const handleOfflineConfirm = useCallback(
		({ gamemode, botDiff }: OfflineConfig) => {
			setParams({ mode: "offline" });
			sessionTypeRef.current = "offline";
			if (gamemode === "solo") {
				offlinePayloadRef.current = { diff: botDiff };
				setLabels({
					self: defaultSelfLabel,
					opponent: `Bot (${
						botDiff.charAt(0).toUpperCase() + botDiff.slice(1)
					})`,
				});
			} else {
				offlinePayloadRef.current = { diff: null };
				setLabels({
					self: "Player 1",
					opponent: "Player 2",
				});
			}
			// envoyer directement la commande play_offline
			const payload = offlinePayloadRef.current;
			const diff = payload ? payload.diff : null;
			lastOfflineDiffRef.current = diff ?? null;
			sendStartEvent({
				action: "play_offline",
				diff,
			});
			offlinePayloadRef.current = null;
		},
		[defaultSelfLabel, setParams, sendStartEvent]
	);

	const handleOfflineCountdown = useCallback(() => {
		// mais on la garde pour eviter les erreurs de reference
		const payload = offlinePayloadRef.current;
		if (payload) {
			const diff = payload.diff ?? null;
			lastOfflineDiffRef.current = diff;
			sendStartEvent({
				action: "play_offline",
				diff,
			});
			offlinePayloadRef.current = null;
		}
		setCountdownState(null);
	}, [sendStartEvent]);

	usePongControls({
		enabled: controlsReady,
		send: (payload) => wsRef.current?.send(JSON.stringify(payload)),
	});

	useEffect(() => {
		if (
			countdownState &&
			countdownState.mode === "remote" &&
			countdownState.value === 1 &&
			!play
		) {
			const failsafeTimer = setTimeout(() => {
				console.log("[Pong] Countdown failsafe triggered");
				setCountdownState(null);
				if (!play) {
					localStart();
				}
			}, 2000);
			return () => clearTimeout(failsafeTimer);
		}
	}, [countdownState, play, localStart]);

	useEffect(() => {
		if (!mode) {
			if (play) stop();
		}
	}, [mode, play, stop]);

	useEffect(() => {
		return () => {
			wsRef?.current?.send(JSON.stringify({ event: "stop_online" }));
		};
	}, []);

	return (
		<div className="relative w-screen h-screen flex items-center justify-center">
			<SpaceBackground />
			<GameOverlay
				play={play || waiting}
				sessionType={sessionTypeRef.current}
				tournamentRound={tournamentRoundRef.current}
			/>
			<GameOverOverlay
				gameOver={gameOver}
				onQuit={handleOnQuitGameover}
				onReplay={handleReplayFromOverlay}
				onContinue={handleContinueFromOverlay}
			/>
			{play && (
				<div className="absolute top-4 left-4 z-50">
					<BackToMenuButton onClick={handleBackToMenu} />
				</div>
			)}
			{!play && !mode && (
				<PongModeSelection
					onSelect={(nextMode) => setParams({ mode: nextMode })}
				/>
			)}
			{mode === "offline" && !play && (
				<OfflineCard
					onCancel={() => {
						setParams(null);
						sessionTypeRef.current = null;
					}}
					onConfirm={handleOfflineConfirm}
				/>
			)}
			{mode === "online" && !play && !waiting && (
				<OnlineCard
					onCancel={() => {
						setParams(null);
						sessionTypeRef.current = null;
					}}
					onConfirm={handleOnlineConfirm}
					wsRef={wsRef}
				/>
			)}
			{waiting && (
				<WaitingOverlay
					training={trainingRef.current}
					onQuit={() => {
						stop();
						setParams({ mode: "online" });
						setWaiting(false);
					}}
					onQuitTraining={() => {
						stop();
						trainingRef.current = false;
						setWaiting(true);
					}}
					onTrain={(diff) => {
						trainingRef.current = true;
						sendStartEvent({ action: "play_offline", diff });
						setLabels({
							self: defaultSelfLabel,
							opponent: `Bot (${
								diff.charAt(0).toUpperCase() + diff.slice(1)
							})`,
						});
						setPlay(true);
					}}
				/>
			)}

			{countdownState &&
				(countdownState.mode === "remote"
					? countdownState.value > 0 && (
							<Countdown value={countdownState.value} />
					  )
					: countdownState.seconds && (
							<Countdown
								seconds={countdownState.seconds}
								onComplete={handleOfflineCountdown}
							/>
					  ))}
			{play && (
				<PongGameArea labels={labels} gameRef={gameRef} scale={SCALE} />
			)}
			<Chat />
		</div>
	);
}
