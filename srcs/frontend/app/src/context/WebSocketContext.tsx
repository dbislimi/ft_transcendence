import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { useUser } from "./UserContext";

interface Friend {
	id: number;
	display_name: string;
	avatar?: string;
	online?: number | boolean;
}

interface FriendsContextType {
	friends: Friend[];
	setFriends: React.Dispatch<React.SetStateAction<Friend[]>>;
	isOnline: (userId: number) => boolean;
	isOnlineStatus: (online?: number | boolean) => boolean;
	refreshFriends: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | null>(null);

export const FriendsProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [friends, setFriends] = useState<Friend[]>([]);
	const { token, user } = useUser();

	const isOnline = (userId: number): boolean => {
		const friend = friends.find((f) => f.id === userId);
		return friend ? friend.online === true || friend.online === 1 : false;
	};

	const isOnlineStatus = (online?: number | boolean): boolean => {
		return online === true || online === 1;
	};

	const refreshFriends = async (): Promise<void> => {
		if (!token) return;

		try {
			const res = await fetch("http://localhost:3000/friends", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const data = await res.json();
				setFriends(data);
			}
		} catch (err) {
			console.error("Erreur lors du chargement des amis:", err);
		}
	};

	useEffect(() => {
		if (token && user?.id) {
			refreshFriends();
		} else {
			setFriends([]);
		}
	}, [token, user?.id]);

	useEffect(() => {
		const handleFriendsMessage = (event: CustomEvent) => {
			const data = event.detail;

			switch (data.type) {
				case "connected":
					console.log("Friends WebSocket: connecté");
					break;

				case "friend_request_received":
				case "friend_request_accepted":
				case "friend_request_rejected":
				case "friend_removed":
				case "user_blocked":
					refreshFriends();
					window.dispatchEvent(
						new CustomEvent("refreshFriendRequests")
					);
					break;

				case "status_update":
					setFriends((prev) =>
						prev.map((friend) =>
							friend.id === data.userId
								? { ...friend, online: data.online }
								: friend
						)
					);
					break;

				case "heartbeat":
					break;
			}
		};

		window.addEventListener(
			"friendsWebSocketMessage",
			handleFriendsMessage as EventListener
		);

		return () => {
			window.removeEventListener(
				"friendsWebSocketMessage",
				handleFriendsMessage as EventListener
			);
		};
	}, [refreshFriends]);

	return (
		<FriendsContext.Provider
			value={{
				friends,
				setFriends,
				isOnline,
				isOnlineStatus,
				refreshFriends,
			}}
		>
			{children}
		</FriendsContext.Provider>
	);
};

export function useFriends() {
	const context = useContext(FriendsContext);
	if (!context) {
		throw new Error("useFriends must be used inside FriendsProvider");
	}
	return context;
}

interface Message {
	from: { id: number; name: string };
	text: string;
	date: string;
	type: "global" | "private" | "info";
	to?: number | null;
}

interface WebSocketContextType {
	pongWsRef: React.MutableRefObject<WebSocket | null>;
	friendsWsRef: React.MutableRefObject<WebSocket | null>;
	messages: Message[];
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
	const chatWsRef = useRef<WebSocket | null>(null);
	const pongWsRef = useRef<WebSocket | null>(null);
	const friendsWsRef = useRef<WebSocket | null>(null);
	const pongRoutesRef = useRef(new Map<string, (data: any) => void>());

	const { isAuthenticated, token } = useUser();

	useEffect(() => {
		if (!isAuthenticated) {
			friendsWsRef.current?.close();
			friendsWsRef.current = null;

			pongWsRef.current = new WebSocket(`ws://localhost:3000/game`);
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

			chatWsRef.current = new WebSocket(`ws://localhost:3000/chat`);
			chatWsRef.current.onopen = () =>
				console.log("Chat Websocket connecté (guest)");
			chatWsRef.current.onclose = () =>
				console.log("Chat Websocket fermé (guest)");
			chatWsRef.current.onmessage = (event) => {
				const data = JSON.parse(event.data);
				setMessages((prev) => [...prev, data]);
			};
			return;
		}

		const tokenParam = encodeURIComponent(token!);

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
		const onClose = (name: string) =>
			console.log(`${name} Websocket fermé`);

		chatWsRef.current.onopen = () => onOpen("Chat");
		pongWsRef.current.onopen = () => onOpen("Pong");
		friendsWsRef.current.onopen = () => onOpen("Friends");

		chatWsRef.current.onclose = () => onClose("Chat");
		pongWsRef.current.onclose = () => onClose("Pong");
		friendsWsRef.current.onclose = () => onClose("Friends");

		chatWsRef.current.onmessage = (event) => {
			const data = JSON.parse(event.data);
			setMessages((prev) => [...prev, data]);
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
			console.log("received: ", parsed);
			const to: string | undefined =
				typeof parsed?.to === "string" ? parsed.to : undefined;
			if (!to) return;
			const handler = pongRoutesRef.current.get(to);
			if (!handler) return;
			try {
				handler(parsed);
			} catch (e) {
				console.error("pong route handler error:", e);
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
				messages,
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
