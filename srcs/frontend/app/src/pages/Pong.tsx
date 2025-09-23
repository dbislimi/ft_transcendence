import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import Chat from "../Components/Chat";
import SpaceBackground from "../Components/SpaceBackground";
import ActionButton from "../Components/ActionButton";
import Countdown from "../Components/Countdown";
import { useGameWebsocket } from "../hooks/useGameWebsocket";
import { usePongControls } from "../hooks/usePongControls";
import { OfflineCard } from "../Components/OfflineCard";
import PongCanvas from "../Components/PongCanvas";
import { useSearchParams } from "react-router-dom";
import usePongParams from "../hooks/usePongParams";
import type { Difficulty } from "../hooks/usePongParams";
import BackToMenuButton from "../Components/BackToMenuButton";
import { OnlineCard } from "../Components/OnlineCard";
interface Player {
	size: number;
	y: number;
	score: number;
}
export interface Bonuses {
	y: number;
	name: string;
	radius: number;
}
export interface Bonus {
	count: number;
	bonuses: Bonuses[];
}
export interface Players {
	p1: Player;
	p2: Player;
}
export interface Ball {
	radius: number;
	x: number;
	y: number;
	speed: number;
}

export default function Pong() {
	const [play, setPlay] = useState(false);
	const [showMode, setShowMode] = useState(false);
	const [search, setSearch] = useState(false);
	const [scale] = useState(4);
	const [winner, setWinner] = useState<number | null>(null);
	const [showCountdown, setShowCountdown] = useState(false);
	const startedRef = useRef(false);

	const gameRef = useRef<{
		ball: Ball;
		players: Players;
		bonus: Bonus;
	}>({
		ball: { radius: 100 / 70, x: 100, y: 50, speed: 0 },
		players: {
			p1: { size: 25, y: 37.5, score: 0 },
			p2: { size: 25, y: 37.5, score: 0 },
		},
		bonus: { count: 0, bonuses: [] },
	});

	const { mode, diff, setParams, gamemode } = usePongParams();

	const handleBackToMenu = () => {
		stop();
		setPlay(false);
		setWinner(null);
		setSearch(false);
		setShowCountdown(false);

		startedRef.current = false;
		setParams({ mode: mode });
	};
	const onMessage = useCallback((event: MessageEvent) => {
		const data = JSON.parse(event.data);
		switch (data.event) {
			case "searching":
				setSearch(true);
				break;
			case "found":
				setSearch(false);
				break;
			case "win":
				setWinner(data.body);
				break;
			case "data":
				gameRef.current.ball = data.body.ball;
				gameRef.current.players = data.body.players;
				gameRef.current.bonus = data.body.bonus;
				break;
		}
	}, []);
	const wsRef = useGameWebsocket("game", onMessage);

	usePongControls({
		enabled: winner === null && play,
		send: (payload) => wsRef.current?.send(JSON.stringify(payload)),
	});

	const showScreen = (flag: boolean) => {
		setPlay(flag);
		setShowCountdown(flag);
	};

	const start = () => {
		wsRef.current?.send(
			JSON.stringify({
				event: "start",
				body: { action: `play_${mode}`, diff: diff },
			})
		);
	};
	const stop = () => {
		wsRef.current?.send(
			JSON.stringify({
				event: "stop",
			})
		);
		gameRef.current = {
			ball: { radius: 100 / 70, x: 100, y: 50, speed: 0 },
			players: {
				p1: { size: 25, y: 37.5, score: 0 },
				p2: { size: 25, y: 37.5, score: 0 },
			},
			bonus: { count: 0, bonuses: [] },
		};
	};

	useLayoutEffect(() => {
		console.log("useeefw");
		if (!mode || !gamemode) return;
		if (mode === "offline") {
			if (gamemode === "solo") {
				const validDiff =
					diff && ["easy", "medium", "hard"].includes(diff);
				if (!validDiff) {
					setParams({
						mode: "offline",
						gamemode: "solo",
						diff: "medium",
					});
				}
			}
			showScreen(true);
		}
	}, [mode, gamemode, diff, setParams]);

	useEffect(() => {
		if (!gamemode) {
			showScreen(false);
		}
	}, [mode, gamemode, play]);

	return (
		<>
			<div className="relative w-screen h-screen flex items-center justify-center">
				{play && (
					<div className="absolute top-4 left-4 z-50">
						<BackToMenuButton onClick={handleBackToMenu} />
					</div>
				)}
				<SpaceBackground />
				{!play && mode === null && (
					<div className="flex flex-col sm:flex-row items-center justify-center gap-8">
						<ActionButton
							color="gray"
							icon={
								<span role="img" aria-label="offline">
									🎮
								</span>
							}
							title="Offline"
							subtitle="Play offline"
							onClick={() => setParams({ mode: "offline" })}
						/>
						<ActionButton
							color="cyan"
							icon={
								<span role="img" aria-label="online">
									🌐
								</span>
							}
							title="Online"
							subtitle="Play online"
							onClick={() => setParams({ mode: "online" })}
						/>
					</div>
				)}
				{mode === "offline" && !play && (
					<OfflineCard
						onCancel={() => setParams(null)}
						onConfirm={(cfg: {
							gamemode: string;
							botDifficulty?: Difficulty;
						}) => {
							const diff =
								cfg.gamemode === "solo"
									? cfg.botDifficulty
									: undefined;
							setParams({
								mode: "offline",
								gamemode: cfg.gamemode,
								diff: diff,
							});
						}}
					/>
				)}
				{mode === "online" && !play && (
					<OnlineCard
						onCancel={() => setParams(null)}
						onConfirm={(cfg: {
							gamemode: string;
							type?: string;
						}) => {
							wsRef.current?.send(
			JSON.stringify({
				event: "start",
				body: { action: `create_tournament`, size:4},
			})
		);
						}}
					/>
				)}
				{showCountdown && (
					<Countdown
						seconds={3}
						onComplete={() => {
							setShowCountdown(false);
							start();
						}}
					/>
				)}
				{play && <PongCanvas gameRef={gameRef} scale={scale} />}
				<Chat />
			</div>
		</>
	);
}
