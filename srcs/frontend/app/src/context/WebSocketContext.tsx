import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { useUser } from "./UserContext";
import { getWebSocketHost } from "../config/api";

export interface Message {
	from: { id: number; name: string };
	text: string;
	date: string;
	type: "global" | "private" | "info";
	to?: number | null;
}

export interface User {
	id: number;
	name: string;
	blocked?: boolean;
}

interface WebSocketContextType {
	pongWsRef: React.MutableRefObject<WebSocket | null>;
	friendsWsRef: React.MutableRefObject<WebSocket | null>;
	chatWsRef: React.MutableRefObject<WebSocket | null>;
	messages: Message[];
	users: User[];
	sendMessage: (msg: {
		type: string;
		text: string;
		to?: number | null;
	}) => void;
	addPongRoute: (route: string, fn: (data: any) => void) => void;
	removePongRoute: (route: string, fn: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const chatWsRef = useRef<WebSocket | null>(null);
	const pongWsRef = useRef<WebSocket | null>(null);
	const friendsWsRef = useRef<WebSocket | null>(null);

	const pongRoutesRef = useRef(new Map<string, (data: any) => void>());

	const { isAuthenticated, token } = useUser();

	useEffect(() => {
		// Always prefer Nginx proxy (port 443) over direct backend port (3001)
		const wsHost = getWebSocketHost();
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const WS_BASE_URL = `${protocol}//${wsHost}`;

		if (!token) {
			friendsWsRef.current?.close();
			friendsWsRef.current = null;

			pongWsRef.current?.close();
			pongWsRef.current = new WebSocket(`${WS_BASE_URL}/game`);
			pongWsRef.current.onopen = () =>
				console.log("Pong Websocket connecté (guest)");
			pongWsRef.current.onclose = () =>
				console.log("Pong Websocket fermé (guest)");
			pongWsRef.current.onmessage = (event) => {
				const data = JSON.parse(event.data);
				console.log("received pong (guest): ", data);
				if (!data.to) return;
				const handler = pongRoutesRef.current.get(data.to);
				if (!handler) return;
				try {
					handler(data);
				} catch (e) {
					console.error("pong route handler error:", e);
				}
			};
			return;
		}
		if (!token) {
			console.log("probleme token websocketscontext");
			return;
		}
		const tokenParam = encodeURIComponent(token);

		console.log("[WebSocket] Initializing connections to", WS_BASE_URL);
		console.log("[WebSocket] Pong URL:", `${WS_BASE_URL}/game?token=***`);
		console.log("[WebSocket] Chat URL:", `${WS_BASE_URL}/chat?token=***`);
		console.log(
			"[WebSocket] Friends URL:",
			`${WS_BASE_URL}/ws-friends?token=***`
		);

		pongWsRef.current?.close();
		chatWsRef.current?.close();
		friendsWsRef.current?.close();

		pongWsRef.current = new WebSocket(
			`${WS_BASE_URL}/game?token=${tokenParam}`
		);
		chatWsRef.current = new WebSocket(
			`${WS_BASE_URL}/chat?token=${tokenParam}`
		);
		friendsWsRef.current = new WebSocket(
			`${WS_BASE_URL}/ws-friends?token=${tokenParam}`
		);

		const onOpen = (name: string) =>
			console.log(`${name} Websocket connecté`);
		const onClose = (name: string) =>
			console.log(`${name} Websocket fermé`);

		chatWsRef.current.onopen = () => onOpen("Chat");
		pongWsRef.current.onopen = () => onOpen("Pong");
		friendsWsRef.current.onopen = () => onOpen("Friends");

		chatWsRef.current.onclose = () => onClose("Chat");
		pongWsRef.current.onclose = () => onClose("Pong");
		friendsWsRef.current.onclose = () => onClose("Friends");

		chatWsRef.current.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === "users") {
					setUsers(data.users);
				} else {
					setMessages((prev) => [...prev, data]);
				}
			} catch (e) {
				console.error("Chat WS parse error", e);
			}
		};

		friendsWsRef.current.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				window.dispatchEvent(
					new CustomEvent("friendsWebSocketMessage", {
						detail: data,
					})
				);
			} catch (err) {
				console.error("Erreur parsing message WebSocket amis:", err);
			}
		};

		pongWsRef.current.onmessage = (msg) => {
			let parsed: any = null;
			try {
				parsed = JSON.parse(msg.data);
			} catch (e) {
				return;
			}
			const to: string | undefined =
				typeof parsed?.to === "string" ? parsed.to : undefined;
			if (!to) return;

			const handler = pongRoutesRef.current.get(to);
			if (handler) {
				try {
					handler(parsed);
				} catch (e) {
					console.error("pong route handler error:", e);
				}
			}
		};

		return () => {
			chatWsRef.current?.close();
			pongWsRef.current?.close();
			friendsWsRef.current?.close();
			chatWsRef.current = null;
			pongWsRef.current = null;
			friendsWsRef.current = null;
		};
	}, [isAuthenticated, token]);

	const sendMessage = (msg: {
		type: string;
		text: string;
		to?: number | null;
	}) => {
		if (
			chatWsRef.current &&
			chatWsRef.current.readyState === WebSocket.OPEN
		) {
			chatWsRef.current.send(JSON.stringify(msg));
		}
	};

	const addPongRoute = (route: string, fn: (data: any) => void) => {
		pongRoutesRef.current.set(route, fn);
	};

	const removePongRoute = (route: string, fn: (data: any) => void) => {
		const current = pongRoutesRef.current.get(route);
		if (current && current === fn) pongRoutesRef.current.delete(route);
	};

	return (
		<WebSocketContext.Provider
			value={{
				pongWsRef,
				friendsWsRef,
				chatWsRef,
				messages,
				users,
				sendMessage,
				addPongRoute,
				removePongRoute,
			}}
		>
			{children}
		</WebSocketContext.Provider>
	);
};

export function useWebSocket() {
	const context = useContext(WebSocketContext);
	if (!context) {
		throw new Error("useWebSocket must be used inside WebSocketProvider");
	}
	return context;
}
