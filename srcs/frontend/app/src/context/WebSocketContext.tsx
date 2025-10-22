import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
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
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const chatWsRef = useRef<WebSocket | null>(null);
	const pongWsRef = useRef<WebSocket | null>(null);
	const friendsWsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) return;
		document.cookie = `token=${token}; path=/; SameSite=Strict`;
		pongWsRef.current = new WebSocket(`ws://localhost:3000/game`);
		chatWsRef.current = new WebSocket(`ws://localhost:3000/chat`);
		friendsWsRef.current = new WebSocket(`ws://localhost:3000/ws-friends`);

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

		// TODO: notification pour rejoindre un tournoi que tas quitte
		pongWsRef.current.onmessage = (msg) => {
			//
		}

		return () => {
			chatWsRef.current?.close();
			pongWsRef.current?.close();
			friendsWsRef.current?.close();
		};
	}, []);

	const sendMessage = (msg: {
		type: string;
		text: string;
		to?: number | null;
	}) => {
		if (chatWsRef.current && chatWsRef.current.readyState === WebSocket.OPEN) {
			chatWsRef.current.send(JSON.stringify(msg));
		}
	};

	return (
		<WebSocketContext.Provider value={{pongWsRef, messages, sendMessage }}>
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
