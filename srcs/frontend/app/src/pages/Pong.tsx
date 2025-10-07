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
	const playerIds = { self: "You", opponent: "Opponent" };
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
		enabled: play,
		send: (payload) => wsRef.current?.send(JSON.stringify(payload)),
	});

	const showScreen = (flag: boolean) => {
		setPlay(flag);
		setShowCountdown(flag);
	};

	const start = () => {
		if (gamemode === "training")
			wsRef.current?.send(
				JSON.stringify({
					event: "start",
					body: { action: "trainbot", diff: diff },
				})
			);
		else
			wsRef.current?.send(
				JSON.stringify({
					event: "start",
					body: { action: `play_${mode}`, diff: diff },
				})
			);
	};
	const stop = useCallback(() => {
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
	}, [wsRef]);

	const startOnline = (
		gamemode: string,
		type: string,
		size: number,
		id: string,
		passwd: string
	) => {
		// console.log(type);
		if (gamemode === "Tournament") {
			setParams({ mode: "online", gamemode: "tournament", id });
			wsRef.current?.send(
				JSON.stringify({
					event: "start",
					body: {
						action: `${type.toLowerCase()}_tournament`,
						id: id,
						size: size,
						passwd: passwd,
					},
				})
			);
		} else {
			setParams({ mode: "online", gamemode: "quickmatch" });
			wsRef.current?.send(
				JSON.stringify({
					event: "start",
					body: {
						action: "play_online",
					},
				})
			);
		}
		setPlay(true);
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
		} else if (!play) {
			setParams({ mode: "online" });
		}
	}, [mode, gamemode, diff, setParams, play]);

	useEffect(() => {
		if (!gamemode) {
			if (play) stop();
			showScreen(false);
		}
	}, [gamemode, play, stop]);

	return (
		<>
			<div className="relative w-screen h-screen flex items-center justify-center">
				{play && (
					<div className="absolute top-4 left-4 z-50">
						<BackToMenuButton onClick={handleBackToMenu} />
					</div>
				)}
				{/*<SpaceBackground />*/}
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
								cfg.gamemode !== "duo"
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
						onConfirm={startOnline}
						wsRef={wsRef}
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
				{play && (
					<div className="relative">
						<div className="absolute -top-10 left-0 right-0 flex justify-between text-xs sm:text-sm font-semibold px-2">
							<div className="flex items-center gap-2">
								<div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] text-white">
									P1
								</div>
								<span className="text-cyan-300">
									{playerIds.self}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-pink-300">
									{playerIds.opponent}
								</span>
								<div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-[10px] text-white">
									P2
								</div>
							</div>
						</div>
						<PongCanvas gameRef={gameRef} scale={scale} />
					</div>
				)}
				<Chat />
			</div>
		</>
	);
}
