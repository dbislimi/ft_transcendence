import { useCallback, useEffect, useRef, useState } from "react";
import PongCanvas from "../Components/PongCanvas";
import Chat from "../Components/Chat";
import SpaceBackground from "../Components/SpaceBackground";
import GameMenu from "../Components/GameMenu";

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
	const [scale] = useState(4);
	const [winner, setWinner] = useState<number | null>(null);
	const ballRef = useRef<Ball>({ radius: 3, x: 100, y: 50, speed: 0 });
	const playersRef = useRef<Players>({
		p1: { size: 25, y: 37.5, score: 0 },
		p2: { size: 25, y: 37.5, score: 0 },
	});
	const onMessage = useCallback((event: MessageEvent) => {
		const message = JSON.parse(event.data);
		console.log(message);
		if (message.event === "win") {
			setWinner(message.win);
		} else {
			ballRef.current = message.data.ball;
			playersRef.current = message.data.players;
		}
	}, []);
	const wsRef = useWebsocket("game", onMessage);

	useEffect(() => {
		if (winner !== null) return;
		const handleKey = (e: KeyboardEvent, type: string) => {
			const key = e.key;
			console.log("key");
			if (["Shift", "s", "ArrowDown"].includes(key))
				wsRef.current?.send(
					JSON.stringify({ event: "down", type: type })
				);
			else if ([" ", "w", "ArrowUp"].includes(key))
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
		wsRef.current?.send(JSON.stringify({event: "restart"}));
	}
	return (
		<>
			<div className="relative h-full w-screen flex flex-col lg:flex-row items-center justify-center">
				<SpaceBackground />

				{/* {winner === null ? (
					<button
						className="absolute z-10 bg-purple-900 text-white hover:bg-blue-400 font-bold py-2 px-4 mt-3 rounded"
						type="button"
						onClick={handleClick}
					>
						{!state ? "start" : "stop"}
					</button>
				) : (
					<div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
						<div className="text-white text-6xl font-extrabold uppercase tracking-wide">
							Winner: Player {winner}
						</div>
						<button
							onClick={handleReplay}
							type="button"
							className=" bg-purple-900 text-white hover:bg-blue-400 font-bold py-2 px-4 mt-3 rounded"
						>
							Replay
						</button>
					</div>
				)} */}
				<GameMenu />
				{/* <PongCanvas ball={ballRef} players={playersRef} scale={scale} /> */}
				<Chat />
			</div>
		</>
	);
}
