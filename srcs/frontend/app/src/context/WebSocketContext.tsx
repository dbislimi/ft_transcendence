import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { useUser } from "./UserContext";
import { Friends } from "../pages";

interface Message {
	from: { id: number; name: string };
	text: string;
	date: string;
	type: "global" | "private" | "info";
	to?: number | null;
}

interface WebSocketContextType {
	pongWsRef: React.MutableRefObject<WebSocket | null>;
	messages: Message[];
	sendMessage: (msg: {
		type: string;
		text: string;
		to?: number | null;
	}) => void;
	addPongListener: (fn: (data: any) => void) => void;
	removePongListener: (fn: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const chatWsRef = useRef<WebSocket | null>(null);
	const pongWsRef = useRef<WebSocket | null>(null);
	const friendsWsRef = useRef<WebSocket | null>(null);
	const pongListenersRef = useRef(
		new Set<(data: any) => void>()
	);

	const { isAuthenticated, token } = useUser();

	useEffect(() => {
		if (!isAuthenticated || !token) {
			chatWsRef.current?.close();
			pongWsRef.current?.close();
			friendsWsRef.current?.close();
			chatWsRef.current = null;
			pongWsRef.current = null;
			friendsWsRef.current = null;
			return;
		}

		const tokenParam = encodeURIComponent(token);

		pongWsRef.current = new WebSocket(
			`ws://localhost:3000/game?token=${tokenParam}`
		);
		chatWsRef.current = new WebSocket(
			`ws://localhost:3000/chat?token=${tokenParam}`
		);
		friendsWsRef.current = new WebSocket(
			`ws://localhost:3000/ws-friends?token=${tokenParam}`
		);

		const onOpen = (name: string) =>
			console.log(`${name} Websocket connecté`);
		const onclose = (name: string) =>
			console.log(`${name} Websocket fermé`);

		chatWsRef.current.onopen = () => onOpen("Chat");
		pongWsRef.current.onopen = () => onOpen("Pong");
		friendsWsRef.current.onopen = () => onOpen("Friends");

		chatWsRef.current.onclose = () => onclose("Chat");
		pongWsRef.current.onclose = () => onclose("Pong");
		friendsWsRef.current.onclose = () => onclose("Friends");

		chatWsRef.current.onmessage = (event) => {
			const data = JSON.parse(event.data);
			setMessages((prev) => [...prev, data]);
		};

		pongWsRef.current.onmessage = (msg) => {
			let parsed: any = null;
			try {
				parsed = JSON.parse(msg.data);
			} catch (e) {
				return;
			}
			for (const fn of pongListenersRef.current) {
				try {
					fn(parsed);
				} catch (e) {
					console.error("pong listener error:", e);
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

	const addPongListener = (fn: (data: any) => void) => {
		pongListenersRef.current.add(fn);
	};

	const removePongListener = (fn: (data: any) => void) => {
		pongListenersRef.current.delete(fn);
	};

	return (
		<WebSocketContext.Provider
			value={{
				pongWsRef,
				messages,
				sendMessage,
				addPongListener,
				removePongListener,
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
