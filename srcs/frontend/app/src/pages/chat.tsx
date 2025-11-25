import { useEffect, useState, useRef } from "react";
import { API_BASE_URL, WS_BASE_URL } from "../config/api";

interface Message {
	from: string;
	fromName: string;
	text: string;
	date: string;
	type: "global" | "private";
	to?: number;
}

export function useWebsocketChat(
	endpoint: string,
	onMessage: (event: MessageEvent) => void
) {
	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) return;

		const ws = new WebSocket(
			`${WS_BASE_URL}/${endpoint}?token=${token}`
		);
		wsRef.current = ws;

		ws.onopen = () => console.log(`ws ouvert`);
		ws.onclose = () => console.log(`ws fermé`);
		ws.onmessage = onMessage;

		return () => {
			ws.close();
		};
	}, [endpoint, onMessage]);

	return wsRef;
}

export default function Chat() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [toUser, setToUser] = useState<number | null>(null);

	const wsRef = useWebsocketChat("chat", (event) => {
		const data = JSON.parse(event.data);
		if (["global", "private"].includes(data.type)) {
			setMessages((prev) => [...prev, data]);
		}
	});

	const sendMessage = (e: React.FormEvent) => {
		e.preventDefault();
		if (wsRef.current && input.trim()) {
			wsRef.current.send(
				JSON.stringify({ type: "message", text: input, to: toUser })
			);
			setInput("");
		}
	};

	const blockUser = (userId: number) => {
		wsRef.current?.send(JSON.stringify({ type: "block", userId }));
	};

	const unblockUser = (userId: number) => {
		wsRef.current?.send(JSON.stringify({ type: "unblock", userId }));
	};

	return (
		<div className="p-4 border rounded bg-white shadow w-full max-w-md mx-auto">
			<h2 className="text-lg font-bold mb-2">💬 Chat</h2>

			<div className="h-64 overflow-y-auto border p-2 mb-2 bg-gray-50">
				{messages.map((m, i) => (
					<div key={i} className="mb-1">
						<strong>{m.fromName}</strong>{" "}
						{m.type === "private" && "(privé)"} : {m.text}
						<span className="text-xs text-gray-500">
							{" "}
							({new Date(m.date).toLocaleTimeString()})
						</span>
					</div>
				))}
			</div>

			<form onSubmit={sendMessage} className="flex mb-2">
				<input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					className="border flex-grow p-2 rounded-l"
					placeholder={
						toUser ? `Message privé à ${toUser}` : "Message global"
					}
				/>
				<button className="bg-blue-600 text-white px-4 rounded-r">
					Envoyer
				</button>
			</form>

			<div className="flex gap-2">
				<button
					onClick={() => setToUser(null)}
					className="bg-gray-300 px-2 py-1 rounded"
				>
					Global
				</button>
				<button
					onClick={() => setToUser(2)}
					className="bg-gray-300 px-2 py-1 rounded"
				>
					MP → User 2
				</button>
				<button
					onClick={() => blockUser(2)}
					className="bg-red-500 text-white px-2 py-1 rounded"
				>
					Bloquer User 2
				</button>
				<button
					onClick={() => unblockUser(2)}
					className="bg-green-500 text-white px-2 py-1 rounded"
				>
					Débloquer User 2
				</button>
			</div>
		</div>
	);
}
