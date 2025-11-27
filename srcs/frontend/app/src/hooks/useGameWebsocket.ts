import { useEffect, useRef } from "react";
import { getWebSocketHost } from "../config/api";
import { useUser } from "../context/UserContext";

export function useGameWebsocket(
	api: string,
	onMessage: (event: MessageEvent) => void
) {
	const wsRef = useRef<WebSocket | null>(null);
	const onMessageRef = useRef(onMessage);
	const { token, isAuthenticated } = useUser();

	useEffect(() => {
		onMessageRef.current = onMessage;
	}, [onMessage]);

	useEffect(() => {
		let ws: WebSocket | null = null;
		let poll: ReturnType<typeof setInterval> | null = null;
		let stopped = false;
		let isConnecting = false;

		function doConnect(authToken: string | null) {
			if (stopped || isConnecting) return;

			if (ws && ws.readyState !== WebSocket.CLOSED) {
				ws.close();
				ws = null;
			}

			isConnecting = true;

			// Always prefer Nginx proxy (port 443) over direct backend port (3001)
			// to avoid certificate trust issues and CORS complications.
			// If on port 5173 (Vite), target localhost (Nginx).
			// If on port 443 (Nginx), target window.location.host (relative).
			const wsHost = getWebSocketHost();
			const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

			const url = authToken
				? `${wsProtocol}//${wsHost}/${api}?token=${encodeURIComponent(authToken)}`
				: `${wsProtocol}//${wsHost}/${api}`;
			console.log(`[ws:${api}] Attempting to connect to: ${url.replace(/token=[^&]+/, 'token=***')}`);




			// const wsHost =
			// 	window.location.hostname === "localhost"
			// 		? "localhost:3001"
			// 		: `${window.location.hostname}:3001`;

			// const wsProtocol =
			// 	window.location.protocol === "https:" ? "wss:" : "ws:";
			// const url = authToken
			// 	? `${wsProtocol}//${wsHost}/${api}?token=${encodeURIComponent(
			// 			authToken
			// 	  )}`
			// 	: `${wsProtocol}//${wsHost}/${api}`;
			// console.log(
			// 	`[ws:${api}] Attempting to connect to: ${url.replace(
			// 		/token=[^&]+/,
			// 		"token=***"
			// 	)}`
			// );

			try {
				ws = new WebSocket(url);
				wsRef.current = ws;

				ws.onopen = () => {
					isConnecting = false;
					console.log(`[ws:${api}] opened`);
				};

				ws.onclose = (event) => {
					isConnecting = false;
					if (!stopped && event.code !== 1000) {
						console.log(`[ws:${api}] closed (code: ${event.code})`);
					}
				};

				ws.onerror = (err) => {
					if (!stopped) {
						console.error(`[ws:${api}] error:`, err);
					}
				};

				ws.onmessage = (event) => onMessageRef.current(event);
			} catch (error) {
				isConnecting = false;
				console.error(`[ws:${api}] Failed to create WebSocket:`, error);
			}
		}

		console.log(`[ws:${api}] Auth check: authenticated=${isAuthenticated}, token=${token ? 'PRESENT' : 'MISSING'}`);

		if (token) {
			console.log(`[ws:${api}] Connecting with authentication`);
			doConnect(token);
		} else {
			console.log(`[ws:${api}] Attempting connection without token (may be rejected by server)`);
			doConnect(null);

			let attempts = 0;
			poll = setInterval(() => {
				attempts++;
				const currentToken = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
				if (currentToken && (!ws || ws.readyState === WebSocket.CLOSED) && !stopped) {
					console.log(`[ws:${api}] Token found after ${attempts} attempts, reconnecting with auth`);
					if (ws && ws.readyState !== WebSocket.CLOSED) {
						ws.close();
					}
					ws = null;
					doConnect(currentToken);
					if (poll) {
						clearInterval(poll);
						poll = null;
					}
				} else if (attempts > 40) {
					if (poll) {
						clearInterval(poll);
						poll = null;
					}
				}
			}, 500);
		}

		return () => {
			stopped = true;
			if (poll) {
				clearInterval(poll);
				poll = null;
			}
			if (ws) {
				const readyState = ws.readyState;
				if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) {
					ws.close();
				}
				ws = null;
				wsRef.current = null;
			}
		};
	}, [api, token, isAuthenticated]);
	return wsRef;
}
