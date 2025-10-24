import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chat from "../Components/Chat";
import SpaceBackground from "../Components/SpaceBackground";
import Countdown from "../Components/Countdown";
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
	const [waiting, setWaiting] = useState(false);
	const [training, setTraining] = useState(false);
	const { mode, setParams } = usePongParams();

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

	const onMessage = useCallback(
		(event: MessageEvent) => {
			const data = JSON.parse(event.data);
			console.log(`data: ${data}`);
			switch (data.event) {
				case "searching": {
					setPlay(false);
					resetLabels();
					setCountdownState(null);
					setControlsReady(false);
					setWaiting(true);
					break;
				}
				case "found": {
					console.log("found");
					setWaiting(false);
					setPlay(true);
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
						if (remaining > 0)
							setCountdownState({
								mode: "remote",
								value: remaining,
							});
						else setCountdownState(null);
					}
					setControlsReady(false);
					break;
				}
				case "data":
					if (!play) break;
					setControlsReady(true);
					gameRef.current.ball = data.body.ball;
					gameRef.current.players = data.body.players;
					gameRef.current.bonuses = data.body.bonuses;
					break;
				case "result": {
					const type: string = data.body.is;
					const didWin: boolean = data.body.didWin;
					const scores: number[] = data.body.scores;
					setControlsReady(false);
					setCountdownState(null);
					setPlay(false);
					resetGameState();
					resetLabels();

					if (training) {
						setTraining(false);
						break;
					}

					break;
				}
				case "tournament_win": {
					setControlsReady(false);
					setCountdownState(null);

					break;
				}
			}
		},
		[play, resetLabels, setControlsReady, labels.opponent, defaultSelfLabel]
	);

	const { pongWsRef, addPongListener, removePongListener } = useWebSocket();

	useEffect(() => {
		addPongListener(onMessage);
		return () => {
			removePongListener(onMessage);
		};
	}, [addPongListener, removePongListener, onMessage]);

	const showGame = useCallback(
		(flag: boolean) => {
			setPlay(flag);
			if (!flag) resetLabels();
			setCountdownState(null);
			setControlsReady(false);
		},
		[resetLabels, setControlsReady]
	);

	const stop = useCallback(() => {
		pongWsRef?.current?.send(
			JSON.stringify({
				event: "stop",
			})
		);
		resetGameState();
		offlinePayloadRef.current = null;
		setCountdownState(null);
		setControlsReady(false);
		resetLabels();
	}, [resetGameState, resetLabels, setControlsReady, pongWsRef]);

	const handleBackToMenu = useCallback(() => {
		stop();
		showGame(false);
		setParams(mode ? { mode } : null);
	}, [mode, showGame, stop, setParams]);

	const sendStartEvent = useCallback(
		(body: Record<string, unknown>) => {
			pongWsRef.current?.send(
				JSON.stringify({
					event: "start",
					body,
				})
			);
		},
		[pongWsRef]
	);

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
				sendStartEvent({
					action: `${matchType.toLowerCase()}_tournament`,
					id,
					size,
					passwd,
				});
				setWaiting(true);
			} else {
				setParams({ mode: "online" });
				sendStartEvent({ action: "play_online" });
				setWaiting(true);
			}
			resetLabels();
		},
		[sendStartEvent, showGame, resetLabels, setParams]
	);

	const handleOfflineConfirm = useCallback(
		({ gamemode, botDiff }: OfflineConfig) => {
			setParams({ mode: "offline" });
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
			showGame(true);
			setCountdownState({ mode: "local", seconds: 1 });
		},
		[defaultSelfLabel, setParams, showGame]
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
			showGame(false);
		}
	}, [mode, play, stop, showGame]);

	useEffect(() => stop, [stop]);

	return (
		<div className="relative w-screen h-screen flex items-center justify-center">
			<SpaceBackground />
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
					onCancel={() => setParams(null)}
					onConfirm={handleOfflineConfirm}
				/>
			)}
			{mode === "online" && !play && !waiting && (
				<OnlineCard
					onCancel={() => setParams(null)}
					onConfirm={handleOnlineConfirm}
					wsRef={pongWsRef}
				/>
			)}
			{waiting && (
				<WaitingOverlay
					training={training}
					onQuit={() => {
						stop();
						showGame(false);
						setParams({ mode: "online" });
						setWaiting(false);
					}}
					onQuitTraining={() => {
						stop();
						showGame(false);
						setTraining(false);
						setWaiting(true);
					}}
					onTrain={(diff) => {
						sendStartEvent({ action: "play_offline", diff });
						setTraining(true);
						setLabels({
							self: defaultSelfLabel,
							opponent: `Bot (${
								diff.charAt(0).toUpperCase() + diff.slice(1)
							})`,
						});
						showGame(true);
					}}
				/>
			)}

			{countdownState &&
				(countdownState.mode === "remote" ? (
					<Countdown value={countdownState.value} />
				) : (
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
