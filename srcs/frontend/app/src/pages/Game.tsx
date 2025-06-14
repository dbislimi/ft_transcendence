import { useCallback, useEffect, useRef, useState } from "react";
import PongCanvas from "../Components/PongCanvas";

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
	const posRef = useRef({ x: 100, y: 50 });
	const onMessage = useCallback((event: MessageEvent) => {
		const message = JSON.parse(event.data);
		posRef.current = message;
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
				<PongCanvas ball={posRef} />
			</div>
		</>
	);
}
