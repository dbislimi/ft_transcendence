import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

export function useGameWebsocket(
	api: string,
	onMessage: (event: MessageEvent) => void
) {
	const wsRef = useRef<WebSocket | null>(null);
	const onMessageRef = useRef(onMessage);
	const { token, isAuthenticated } = useAuth();

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
			
			// Fermer la connexion précédente si elle existe
			if (ws && ws.readyState !== WebSocket.CLOSED) {
				ws.close();
				ws = null;
			}
			
			isConnecting = true;
			
			// Déterminer l'URL du WebSocket en fonction de l'environnement
			// En production ou sur réseau local, utiliser window.location.hostname
			// Le backend écoute sur le port 3001
			const wsHost = window.location.hostname === 'localhost' 
				? 'localhost:3001' 
				: `${window.location.hostname}:3001`;
			
			const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const url = authToken
				? `${wsProtocol}//${wsHost}/${api}/ws?token=${encodeURIComponent(authToken)}`
				: `${wsProtocol}//${wsHost}/${api}/ws`;
			console.log(`[ws:${api}] Attempting to connect to: ${url.replace(/token=[^&]+/, 'token=***')}`);
			
			try {
				ws = new WebSocket(url);
				wsRef.current = ws;
				
				ws.onopen = () => {
					isConnecting = false;
					console.log(`[ws:${api}] opened`);
				};
				
				ws.onclose = (event) => {
					isConnecting = false;
					// Ne pas logger les fermetures normales ou celles causées par le cleanup
					if (!stopped && event.code !== 1000) {
						console.log(`[ws:${api}] closed (code: ${event.code})`);
					}
				};
				
				ws.onerror = (err) => {
					// Ignorer les erreurs si on est en train de nettoyer
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
		
		// Pour le jeu Pong, permettre une tentative de connexion même sans token
		// Le backend décidera s'il accepte ou non (mode offline peut nécessiter auth selon config)
		if (token) {
			console.log(`[ws:${api}] Connecting with authentication`);
			doConnect(token);
		} else {
			// Tenter une connexion sans token pour le mode offline
			// Le backend peut fermer la connexion s'il nécessite l'auth
			console.log(`[ws:${api}] Attempting connection without token (may be rejected by server)`);
			doConnect(null);
			
			// Surveiller l'arrivée du token pour reconnecter avec auth si disponible
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
					// Arrêter de surveiller après 20 secondes
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
			// Fermer la connexion seulement si elle est ouverte ou en cours de connexion
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
