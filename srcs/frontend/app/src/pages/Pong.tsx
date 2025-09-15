import { useCallback, useRef, useState } from "react";
import Chat from "../Components/Chat";
import SpaceBackground from "../Components/SpaceBackground";
import ActionButton from "../Components/ActionButton";
import Countdown from "../Components/Countdown";
import { useGameWebsocket } from "../hooks/useGameWebsocket";
import { usePongControls } from "../hooks/usePongControls";
import { OfflineCard } from "../Components/OfflineCard";
import PongCanvas from "../Components/PongCanvas";

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

export default function Game() {
	const [play, setPlay] = useState(false);
	const [showMode, setShowMode] = useState(false);
	const [search, setSearch] = useState(false);
	const [scale] = useState(4);
	const [winner, setWinner] = useState<number | null>(null);
	const [offlineCountdownRunning, setOfflineCountdownRunning] =
		useState(false);
	const pendingPlayRef = useRef<{ online: boolean; diff?: string } | null>(
		null
	);

	const ballRef = useRef<Ball>({ radius: 3, x: 100, y: 50, speed: 0 });
	const playersRef = useRef<Players>({
		p1: { size: 25, y: 37.5, score: 0 },
		p2: { size: 25, y: 37.5, score: 0 },
	});
	const bonusRef = useRef<Bonus>({ count: 0, bonuses: [] });

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
				ballRef.current = data.body.ball;
				playersRef.current = data.body.players;
				bonusRef.current = data.body.bonus;
				break;
		}
	}, []);
	const wsRef = useGameWebsocket("game", onMessage);

	usePongControls({
		enabled: winner === null && play,
		send: (payload) => wsRef.current?.send(JSON.stringify(payload)),
	});

	const handlePlay = (online: boolean, diff?: string) => {
		if (online && diff === undefined)
			wsRef.current?.send(
				JSON.stringify({
					event: "start",
					body: { action: "play_online" },
				})
			);
		else if (online && diff)
			wsRef.current?.send(
				JSON.stringify({
					event: "start",
					body: { action: "trainbot", diff },
				})
			);
		else
			wsRef.current?.send(
				JSON.stringify({
					event: "start",
					body: { action: "play_offline", diff },
				})
			);
		setPlay(true);
	};

	const startOfflineWithCountdown = (diff?: string) => {
		pendingPlayRef.current = { online: false, diff };
		setOfflineCountdownRunning(true);
	};

	return (
		<>
			<div className="relative h-full w-screen flex items-center justify-center">
				{/*<SpaceBackground />*/}
				{offlineCountdownRunning && (
					<Countdown
						seconds={3}
						running={offlineCountdownRunning}
						onComplete={() => {
							setOfflineCountdownRunning(false);
							const cfg = pendingPlayRef.current;
							if (cfg) {
								handlePlay(cfg.online, cfg.diff);
								pendingPlayRef.current = null;
							}
						}}
					/>
				)}
				{!showMode && !play && !offlineCountdownRunning && (
					<div className="grid gap-8 max-w-5xl mx-auto grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
						<ActionButton
							color="gray"
							icon={
								<span
									className="text-cyan-400 text-2xl"
									role="img"
									aria-label="offline"
								>
									🎮
								</span>
							}
							title="Offline"
							subtitle="Play offline"
							onClick={() => setShowMode(true)}
						/>
						<ActionButton
							color="cyan"
							icon={
								<span
									className="text-cyan-400 text-2xl"
									role="img"
									aria-label="online"
								>
									🌐
								</span>
							}
							title="Online"
							subtitle="Play online"
							onClick={() => handlePlay(true)}
						/>
					</div>
				)}
				{showMode && !play && !offlineCountdownRunning && (
					<OfflineCard
						onCancel={() => setShowMode(false)}
						onConfirm={(cfg: {
							players: number;
							botDifficulty?: string;
						}) => {
							if (cfg.players === 1)
								startOfflineWithCountdown(cfg.botDifficulty);
							else startOfflineWithCountdown();
						}}
					/>
				)}
				{play && (
					<PongCanvas
						players={playersRef}
						ball={ballRef}
						bonus={bonusRef}
						scale={scale}
					/>
				)}
				<Chat />
			</div>
		</>
	);
}
