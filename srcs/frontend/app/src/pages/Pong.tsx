import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chat from "../Components/Chat";
import SpaceBackground from "../Components/SpaceBackground";
import GameOverlay from "../Components/GameOverlay";
import GameOverOverlay from "../Components/GameOverOverlay";
import Countdown from "../Components/Countdown";
import SearchingOverlay from "../Components/SearchingOverlay";
import WaitingOverlay from "../Components/WaitingOverlay";
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
import { useNavigate } from "react-router-dom";

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
	console.log("PONG");
	const { user } = useUser();

	console.log("user: ", user);
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
	const [searching, setSearching] = useState(false);
	const [waiting, setWaiting] = useState<{ opponentName: string } | null>(
		null
	);
	const trainingRef = useRef(false);
	const isTournamentRef = useRef(false);
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
		opponent?: string;
	} | null;

	const [gameOver, setGameOver] = useState<GameOverState>(null);

	const gameRef = useRef<GameState>(initGameState());
	const offlinePayloadRef = useRef<{ diff: Difficulty | null } | null>(null);
	const controlsReadyRef = useRef(false);
	const setControlsReady = useCallback((next: boolean) => {
		controlsReadyRef.current = next;
	}, []);
	const isControlsReady = useCallback(() => controlsReadyRef.current, []);

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
		setWaiting(null);
	}, [resetGameState, resetLabels, setControlsReady]);

	const localStart = useCallback(
		(opts?: { labels?: PlayerLabels }) => {
			resetGameState();
			if (opts?.labels) setLabels(opts.labels);
			setControlsReady(false);
			setSearching(false);
			setPlay(true);
		},
		[resetGameState, setControlsReady]
	);

	const onMessage = useCallback(
		(data: any) => {
			if (!data) return;
			console.log(`data: ${data.event}`);
			switch (data.event) {
				case "searching": {
					console.log("searching");
					const tr = data.body?.tournamentRound;
					if (tr && typeof tr.depth === "number") {
						const depth = Number(tr.depth);
						const initialDepth =
							typeof tr.initialDepth === "number"
								? tr.initialDepth
								: undefined;
						tournamentRoundRef.current = { depth, initialDepth };
					}
					setSearching(true);
					setCountdownState(null);
					setControlsReady(false);
					setPlay(false);
					break;
				}
				case "found": {
					console.log("found");
					trainingRef.current = false;
					setWaiting(null);
					const tr = data.body?.tournamentRound;
					if (tr && typeof tr.depth === "number") {
						const depth = Number(tr.depth);
						const initialDepth =
							typeof tr.initialDepth === "number"
								? tr.initialDepth
								: undefined;
						tournamentRoundRef.current = { depth, initialDepth };
					}
					const opponentLabel = data.body?.opponent;
					const nextLabels: PlayerLabels = {
						self: defaultSelfLabel,
						opponent:
							typeof opponentLabel === "string" &&
							opponentLabel.trim().length
								? opponentLabel
								: PLAYER_LABELS.opponent,
					};
					localStart({ labels: nextLabels });
					break;
				}
				case "waiting": {
					const opponentName = data.who;
					if (
						typeof opponentName === "string" &&
						opponentName.trim().length
					) {
						setWaiting({ opponentName });
					}
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
						} else setCountdownState(null);
					}
					setControlsReady(false);
					setWaiting(null);
					break;
				}
				case "data":
					setControlsReady(true);
					setWaiting(null);
					gameRef.current.ball = data.body.ball;
					gameRef.current.players = data.body.players;
					gameRef.current.bonuses = data.body.bonuses;
					break;
				case "result": {
					const type: string = data.body.is;
					const didWin: boolean = data.body.didWin;
					const scores: number[] = data.body.scores;
					const opponentFromResult: string | undefined =
						data.body?.opponent;
					const tr = data.body?.tournamentRound;
					if (tr && typeof tr.depth === "number") {
						const depth = Number(tr.depth);
						const initialDepth =
							typeof tr.initialDepth === "number"
								? tr.initialDepth
								: undefined;
						tournamentRoundRef.current = { depth, initialDepth };
					}
					if (trainingRef.current) {
						trainingRef.current = false;
						setControlsReady(false);
						setCountdownState(null);
						setWaiting(null);
						setPlay(false);
						setSearching(true);
						break;
					} else {
						const isTournamentFinalWin =
							type === "tournament" &&
							didWin === true &&
							!!tournamentRoundRef.current &&
							Number(tournamentRoundRef.current.depth) === 1;
						setGameOver({
							didWin,
							scores,
							tournamentRound: tournamentRoundRef.current,
							finalTournamentWin:
								isTournamentFinalWin || undefined,
							type,
							opponent: opponentFromResult,
						});
					}
					setControlsReady(false);
					setCountdownState(null);
					setWaiting(null);
					setSearching(false);
					if (type === "tournament") {
						const nextLabels: PlayerLabels | undefined =
							opponentFromResult
								? {
										self: defaultSelfLabel,
										opponent: opponentFromResult,
								  }
								: undefined;
						localStart(
							nextLabels ? { labels: nextLabels } : undefined
						);
					}
					break;
				}
				case "error":
					if (data.msg === "tournamentId")
						window.alert(
							"Le nom de tournoi est deja utilisé. Choisissez-en un autre"
						);
					else if (data.msg === "rejoin_active") {
						window.alert(
							"Vous avez une partie de tournoi en attente de reconnexion. Reprenez-la ou attendez la fin du délai."
						);
						setSearching(false);
						setPlay(false);
						setCountdownState(null);
					}
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
		]
	);

	const { pongWsRef, addPongRoute, removePongRoute } = useWebSocket();

	useEffect(() => {
		addPongRoute("pong", onMessage);
		return () => {
			removePongRoute("pong", onMessage);
		};
	}, [addPongRoute, removePongRoute, onMessage]);

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
			pongWsRef?.current?.send(JSON.stringify({ event: stop }));
			localStop();
		},
		[localStop, pongWsRef]
	);

	const handleBackToMenu = useCallback(() => {
		setGameOver(null);
		stop(true);
		setParams(mode ? { mode } : null);
		sessionTypeRef.current = mode as "offline" | "online" | null;
		isTournamentRef.current = false;
	}, [mode, stop, setParams]);

	const handleOnQuitGameover = useCallback(() => {
		setGameOver(null);
		if (
			gameOver &&
			gameOver.tournamentRound &&
			gameOver.didWin &&
			!gameOver.finalTournamentWin
		) {
			stop(true);
			return;
		}
		localStop();
	}, [localStop, gameOver]);

	const sendStartEvent = useCallback(
		(body: Record<string, unknown>) => {
			if (!trainingRef.current) {
				lastStartPayloadRef.current = body;
			}
			pongWsRef.current?.send(
				JSON.stringify({
					event: "start",
					body,
				})
			);
		},
		[pongWsRef]
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
	}, [sendStartEvent]);

	const handleContinueFromOverlay = useCallback(() => {
		if (autoContinueTimeoutRef.current) {
			clearTimeout(autoContinueTimeoutRef.current);
			autoContinueTimeoutRef.current = null;
		}

		setGameOver(null);
		pongWsRef.current?.send(JSON.stringify({ event: "ready" }));
		setSearching(true);
		setPlay(false);
		setControlsReady(false);
		setCountdownState(null);
	}, [pongWsRef]);

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
				isTournamentRef.current = true;
				sendStartEvent({
					action: `${matchType.toLowerCase()}_tournament`,
					id,
					size,
					passwd,
				});
			} else {
				setParams({ mode: "online" });
				sessionTypeRef.current = "online";
				isTournamentRef.current = false;
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
			localStart();
			setCountdownState({ mode: "local", seconds: 1 });
		},
		[defaultSelfLabel, setParams]
	);

	const handleOfflineCountdown = useCallback(() => {
		const payload = offlinePayloadRef.current;
		const diff = payload ? payload.diff : null;
		lastOfflineDiffRef.current = diff ?? null;
		sendStartEvent({
			action: "play_offline",
			diff,
		});
		offlinePayloadRef.current = null;
		setCountdownState(null);
	}, [sendStartEvent]);

	usePongControls({
		isEnabled: isControlsReady,
		send: (payload) => pongWsRef.current?.send(JSON.stringify(payload)),
	});

	useEffect(() => {
		if (!mode) {
			if (play) stop();
		}
	}, [mode, play, stop]);

	useEffect(() => {
		return () => {
			pongWsRef?.current?.send(JSON.stringify({ event: "stop_online" }));
		};
	}, []);

	return (
		<div className="relative w-screen h-screen flex items-center justify-center">
			<SpaceBackground />
			<GameOverlay
				play={play || searching}
				sessionType={sessionTypeRef.current}
				tournamentRound={tournamentRoundRef.current}
				isTournament={isTournamentRef.current}
			/>
			<GameOverOverlay
				gameOver={gameOver}
				onQuit={handleOnQuitGameover}
				onReplay={handleReplayFromOverlay}
				onContinue={handleContinueFromOverlay}
			/>
			{waiting && play && (
				<WaitingOverlay opponentName={waiting.opponentName} />
			)}
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
			{mode === "online" && !play && !searching && (
				<OnlineCard
					onCancel={() => {
						setParams(null);
						sessionTypeRef.current = null;
						isTournamentRef.current = false;
					}}
					onConfirm={handleOnlineConfirm}
				/>
			)}
			{searching && (
				<SearchingOverlay
					training={trainingRef.current}
					onQuit={() => {
						stop();
						setParams({ mode: "online" });
						setSearching(false);
					}}
					onQuitTraining={() => {
						stop();
						trainingRef.current = false;
						setSearching(true);
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
					? countdownState.value && (
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
		</div>
	);
}
