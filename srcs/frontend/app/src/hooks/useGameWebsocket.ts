import { useEffect, useRef } from "react";

export function useGameWebsocket(
	api: string,
	onMessage: (event: MessageEvent) => void
) {
	const wsRef = useRef<WebSocket | null>(null);
	useEffect(() => {
		const ws = new WebSocket(`ws://localhost:3000/${api}/ws`);
		wsRef.current = ws;
		ws.onopen = () => console.log(`[ws:${api}] opened`);
		ws.onclose = () => console.log(`[ws:${api}] closed`);
		ws.onmessage = onMessage;
		return () => {
			ws.close();
		};
	}, [api, onMessage]);
	return wsRef;
}
