import { useCallback, useEffect, useRef, useState } from "react";
import PongCanvas from "../Components/PongCanvas";
import Chat from "../Components/Chat";
import SpaceBackground from "../Components/SpaceBackground";
import BackgroundSurface from "../Components/BackgroundSurface";

interface Player {
	size: number;
	y: number;
	score: number;
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

function useWebsocket(onMessage: (event: MessageEvent) => void) {
	const ws = useRef<WebSocket | null>(null);

	useEffect(() => {
		ws.current = new WebSocket("ws://localhost:3000/ws/game");
		ws.current.onopen = () => console.log("ws opened");
		ws.current.onclose = () => console.log("ws closed");
		ws.current.onmessage = onMessage;
		return () => {
			if (ws.current) ws.current.close();
		};
	}, [onMessage]);
	return ws;
}

export default function Game() {
	const [state, setState] = useState(false);
	const [scale, setScale] = useState(4);
	const ballRef = useRef<Ball>({ radius: 3, x: 100, y: 50, speed:0 });
	const playersRef = useRef<Players>({
		p1: { size: 25, y: 37.5, score: 0},
		p2: { size: 25, y: 37.5, score: 0},
	});
	const onMessage = useCallback((event: MessageEvent) => {
		const message = JSON.parse(event.data);
		//console.log(message);
		ballRef.current = message.ball;
		playersRef.current = message.players;
	}, []);
	const wsRef = useWebsocket(onMessage);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent, type: string) => {
			const key = e.key;
			console.log("key");
			if (["Shift", "s", "ArrowDown"].includes(e.key))
				wsRef.current?.send(
					JSON.stringify({ event: "down", type: type })
				);
			else if ([" ", "w", "ArrowUp"].includes(e.key))
				wsRef.current?.send(
					JSON.stringify({ event: "up", type: type })
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
	}, []);
	const handleClick = () => {
		setState(!state);
		state
			? wsRef.current?.send(JSON.stringify({ event: "stop" }))
			: wsRef.current?.send(JSON.stringify({ event: "start" }));
	};
	return (
		<BackgroundSurface game="pong">
		<SpaceBackground />
			<div className="relative min-h-screen w-full flex flex-col lg:flex-row items-center justify-center">
				<button
					className="absolute z-10 bg-purple-900 text-white hover:bg-blue-400 font-bold py-2 px-4 mt-3 rounded"
					type="button"
					onClick={handleClick}
				>
					{!state ? "start" : "stop"}
				</button>
					<PongCanvas
						ball={ballRef}
						players={playersRef}
						scale={scale}
					/>
				<Chat />
			</div>
		</BackgroundSurface>
	);
}
