import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chat from "../Components/Chat";
import SpaceBackground from "../Components/SpaceBackground";
import Countdown from "../Components/Countdown";
import { usePongControls } from "../hooks/usePongControls";
import { OfflineCard } from "../Components/OfflineCard";
import usePongParams from "../hooks/usePongParams";
import BackToMenuButton from "../Components/BackToMenuButton";
import { OnlineCard } from "../Components/OnlineCard";
import { useWebsocket } from "./chat";
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
	console.log("user: ",localStorage.getItem('user'));
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
	const [labels, setLabels] = useState<PlayerLabels>(() =>
		getDefaultLabels()
	);
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
			if (!play) return;
			const data = JSON.parse(event.data);
			switch (data.event) {
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
					setControlsReady(true);
					gameRef.current.ball = data.body.ball;
					gameRef.current.players = data.body.players;
					gameRef.current.bonuses = data.body.bonuses;
					break;
				case "stop":
					setControlsReady(false);
					setCountdownState(null);
					resetLabels();
					break;
			}
		},
		[play, resetLabels, setControlsReady]
	);

	const wsRef = useWebsocket("game", onMessage);

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
		wsRef.current?.send(
			JSON.stringify({
				event: "stop",
			})
		);
		resetGameState();
		offlinePayloadRef.current = null;
		setCountdownState(null);
		setControlsReady(false);
		resetLabels();
	}, [resetGameState, resetLabels, setControlsReady, wsRef]);

	const handleBackToMenu = useCallback(() => {
		stop();
		showGame(false);
		setParams(mode ? { mode } : null);
	}, [mode, showGame, stop, setParams]);

	const sendStartEvent = useCallback(
		(body: Record<string, unknown>) => {
			wsRef.current?.send(
				JSON.stringify({
					event: "start",
					body,
				})
			);
		},
		[wsRef]
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
			} else {
				setParams({ mode: "online" });
				sendStartEvent({ action: "play_online" });
			}
			resetLabels();
			showGame(true);
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
			setCountdownState({ mode: "local", seconds: 3 });
		},
		[defaultSelfLabel, setParams, showGame]
	);

	const handleOfflineCountdown = useCallback(() => {
		const payload = offlinePayloadRef.current;
		sendStartEvent({
			action: "play_offline",
			diff: payload ? payload.diff : null,
		});
		offlinePayloadRef.current = null;
		setCountdownState(null);
	}, [sendStartEvent]);

	usePongControls({
		isEnabled: isControlsReady,
		send: (payload) => wsRef.current?.send(JSON.stringify(payload)),
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
			{mode === "online" && !play && (
				<OnlineCard
					onCancel={() => setParams(null)}
					onConfirm={handleOnlineConfirm}
					wsRef={wsRef}
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
			<Chat />
		</div>
	);
}
