import { useEffect, useRef } from "react";

export function useGameWebsocket(
	api: string,
	onMessage: (event: MessageEvent) => void
) {
	const wsRef = useRef<WebSocket | null>(null);
	const onMessageRef = useRef(onMessage);

	// Mettre à jour la référence du callback sans recréer la connexion
	useEffect(() => {
		onMessageRef.current = onMessage;
	}, [onMessage]);

	useEffect(() => {
		const ws = new WebSocket(`ws://localhost:3000/${api}/ws`);
		wsRef.current = ws;
		ws.onopen = () => console.log(`[ws:${api}] opened`);
		ws.onclose = () => console.log(`[ws:${api}] closed`);
		ws.onmessage = (event) => onMessageRef.current(event);
		return () => {
			ws.close();
		};
	}, [api]); // Seulement api comme dépendance
	return wsRef;
}
