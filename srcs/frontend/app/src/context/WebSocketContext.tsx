import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

interface Message {
	from: { id: number; name: string };
	text: string;
	date: string;
	type: "global" | "private" | "info";
	to?: number | null;
}

interface WebSocketContextType {
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
	const wsRef = useRef<WebSocket | null>(null);
	const pongWsRef = useRef<WebSocket | null>(null);
	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) return;
		document.cookie = `token=${token}; path=/; SameSite=Strict`;
		const pongWs = new WebSocket(`ws://localhost:3000/game`);
		// const ws = new WebSocket(`ws://localhost:3000/chat?token=${token}`);
		// wsRef.current = ws;

		// ws.onopen = () => console.log("✅ WebSocket connecté");
		// ws.onclose = () => console.log("❌ WebSocket fermé");
		// ws.onmessage = (event) => {
		// 	const data = JSON.parse(event.data);
		// 	setMessages((prev) => [...prev, data]);
		// };

		return () => {
			// ws.close();
		};
	}, []);

	const sendMessage = (msg: {
		type: string;
		text: string;
		to?: number | null;
	}) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(msg));
		}
	};

	return (
		<WebSocketContext.Provider value={{ messages, sendMessage }}>
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
