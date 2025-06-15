import { useCallback, useEffect, useRef, useState } from "react";
import PongCanvas from "../Components/PongCanvas";

export interface Players {
	p1: { size: number; y: number };
	p2: { size: number; y: number };
}

export interface Ball {
	radius: number;
	x: number;
	y: number;
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
	const ballRef = useRef<Ball>({ radius: 3, x: 100, y: 50 });
	const playersRef = useRef<Players>({
		p1: { size: 25, y: 37.5 },
		p2: { size: 25, y: 37.5 },
	});
	const onMessage = useCallback((event: MessageEvent) => {
		const message = JSON.parse(event.data);
		//console.log(message);
		ballRef.current = message.ball;
		playersRef.current = message.players;
	}, []);
	const wsRef = useWebsocket(onMessage);

	const handleClick = () => {
		setState(!state);
		state ? wsRef.current?.send("stop") : wsRef.current?.send("start");
	};
	return (
		<>
			<div className="h-screen w-screen flex items-center justify-center">
				<button
					className="z-10 bg-purple-900 text-white hover:bg-blue-400 font-bold py-2 px-4 mt-3 rounded"
					type="button"
					onClick={handleClick}
				>
					{!state ? "start" : "stop"}
				</button>
				<button
					className="z-10 bg-purple-900 text-white hover:bg-blue-400 font-bold py-2 px-4 mt-3 rounded"
					type="button"
					onClick={() => setScale(scale + 1)}
				>
					SCALE
				</button>
				<PongCanvas
					ball={ballRef}
					players={playersRef}
					scale={scale}
				/>
			</div>
		</>
	);
}
