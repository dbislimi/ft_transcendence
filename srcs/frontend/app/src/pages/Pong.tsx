import { useCallback, useEffect, useRef, useState } from "react";
import PongCanvas from "../Components/PongCanvas";
import GameMenu from "../Components/GameMenu";
import type { difficulty } from "../Components/GameMenu";
import Chat from "../Components/Chat";
import SpaceBackground from "../Components/SpaceBackground";
import BackgroundSurface from "../Components/BackgroundSurface";
import ActionButton from "../Components/ActionButton";

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

function useWebsocket(api: string, onMessage: (event: MessageEvent) => void) {
	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		const ws = new WebSocket(`ws://localhost:3000/${api}/ws`);
		wsRef.current = ws;
		ws.onopen = () => console.log("ws opened");
		ws.onclose = () => console.log("ws closed");
		ws.onmessage = onMessage;
		return () => {
			ws.close();
		};
	}, [onMessage, api]);
	return wsRef;
}

export default function Game() {
	const [state, setState] = useState(false);
	const [play, setPlay] = useState(false);
	const [search, setSearch] = useState(false);
	const [scale] = useState(4);
	const [winner, setWinner] = useState<number | null>(null);
	const ballRef = useRef<Ball>({ radius: 3, x: 100, y: 50, speed: 0 });
	const playersRef = useRef<Players>({
		p1: { size: 25, y: 37.5, score: 0 },
		p2: { size: 25, y: 37.5, score: 0 },
	});
	const bonusRef = useRef<Bonus>({ count: 0, bonuses: [] });
	const onMessage = useCallback((event: MessageEvent) => {
		const data = JSON.parse(event.data);
		console.log(data);
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
	const wsRef = useWebsocket("game", onMessage);

	useEffect(() => {
		if (winner !== null) return;
		const handleKey = (e: KeyboardEvent, type: string) => {
			const key = e.key;
			if (["Shift", "s"].includes(key))
				wsRef.current?.send(
					JSON.stringify({
						event: "play",
						body: { type: type, dir: "down", id: 0 },
					})
				);
			else if (["ArrowDown"].includes(key))
				wsRef.current?.send(
					JSON.stringify({
						event: "play",
						body: { type: type, dir: "down", id: 1 },
					})
				);
			else if ([" ", "w"].includes(key))
				wsRef.current?.send(
					JSON.stringify({
						event: "play",
						body: { type: type, dir: "up", id: 0 },
					})
				);
			else if (["ArrowUp"].includes(key))
				wsRef.current?.send(
					JSON.stringify({
						event: "play",
						body: { type: type, dir: "up", id: 1 },
					})
				);
		};
		const keydown = (e: KeyboardEvent) => {
			if (e.repeat) return;
			handleKey(e, "press");
		};
		const keyup = (e: KeyboardEvent) => handleKey(e, "release");

		document.addEventListener("keydown", keydown);
		document.addEventListener("keyup", keyup);
		return () => {
			document.removeEventListener("keydown", keydown);
			document.removeEventListener("keyup", keyup);
		};
	}, [winner, wsRef]);
	const handleClick = () => {
		if (winner !== null) return;
		const newState = !state;
		setState(newState);
		if (newState) {
			wsRef.current?.send(JSON.stringify({ event: "start" }));
		} else {
			wsRef.current?.send(JSON.stringify({ event: "stop" }));
		}
	};
	const handleReplay = () => {
		setWinner(null);
		setState(false);
		wsRef.current?.send(JSON.stringify({ event: "restart" }));
	};
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
					body: { action: "trainbot", diff: diff },
				})
			);
		else
			wsRef.current?.send(
				JSON.stringify({
					event: "start",
					body: { action: "play_offline", diff: diff },
				})
			);
		setPlay(!play);
	};
	return (
		<>
			<div className="relative h-full w-screen flex items-center justify-center">
				<SpaceBackground />
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
					/>
				</div>
				{/*{play ? (
                    <PongCanvas
                        ball={ballRef}
                        players={playersRef}
                        bonus={bonusRef}
                        scale={scale}
                    />
                ) : (
                    <GameMenu start={handlePlay} />
                )}
                {search && (
                    <div className="z-20 text-5xl text-white">
                        Searching ...
                    </div>
                )}*/}
				<Chat />
			</div>
		</>
	);
}
