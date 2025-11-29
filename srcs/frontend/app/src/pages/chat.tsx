import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
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
		const token = sessionStorage.getItem("token");
		if (!token) return;

		const ws = new WebSocket(
			`${WS_BASE_URL}/${endpoint}?token=${token}`
		);
		wsRef.current = ws;

		ws.onopen = () => console.log(`ws ouvert`);
		ws.onclose = () => console.log(`ws ferme`);
		ws.onmessage = onMessage;

		return () => {
			ws.close();
		};
	}, [endpoint, onMessage]);

	return wsRef;
}

export default function Chat() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { messages, users, sendMessage: wsSendMessage, chatWsRef } = useWebSocket();
	const [input, setInput] = useState("");
	const [toUser, setToUser] = useState<number | null>(null);
	const [contextMenu, setContextMenu] = useState<{ x: number; y: number; userId: number; userName: string } | null>(null);

	console.log("[Chat] Rendu avec users:", users, "messages:", messages.length);

	const sendMessage = (e: React.FormEvent) => {
		e.preventDefault();
		if (input.trim()) {
			wsSendMessage({ type: "message", text: input, to: toUser });
			setInput("");
		}
	};

	const blockUser = (userId: number) => {
		if (chatWsRef.current?.readyState === WebSocket.OPEN) {
			chatWsRef.current.send(JSON.stringify({ type: "block", userId }));
		}
	};

	const unblockUser = (userId: number) => {
		if (chatWsRef.current?.readyState === WebSocket.OPEN) {
			chatWsRef.current.send(JSON.stringify({ type: "unblock", userId }));
		}
	};

	return (
		<div className="p-6 rounded-xl bg-slate-800/80 backdrop-blur-md border border-slate-600/30 shadow-2xl w-full max-w-md mx-auto">
			<h2 className="text-xl font-bold mb-4 text-white">Chat</h2>

			{/* Liste des utilisateurs connectés */}
			<div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
				<h3 className="text-sm font-semibold text-slate-300 mb-2">
					{t('common.online')} ({users.length})
				</h3>
				<div className="flex flex-wrap gap-2">
					{users.length === 0 ? (
						<p className="text-xs text-slate-400 italic">{t('chat.noUsersOnline')}</p>
					) : (
						users.map((user) => (
							<div
								key={`${user.id}-${user.name}`}
								className={`inline-flex items-center px-2 py-1 rounded text-xs ${
									user.blocked
										? "bg-red-600/20 text-red-300"
										: "bg-green-600/20 text-green-300"
								}`}
							>
								<span className={`w-2 h-2 rounded-full mr-1.5 ${user.blocked ? 'bg-red-500' : 'bg-green-500'}`}></span>
								{user.name}
							</div>
						))
					)}
				</div>
			</div>

			<div className="h-64 overflow-y-auto border p-2 mb-2 bg-gray-50">
				{messages.map((m, i) => (
					<div
						key={i}
						className="mb-1 cursor-pointer hover:bg-gray-100 p-1 rounded"
						onContextMenu={(e) => {
							e.preventDefault();
							setContextMenu({
								x: e.clientX,
								y: e.clientY,
								userId: m.from.id,
								userName: m.from.name,
							});
						}}
					>
						<strong>{m.from.name}</strong>{" "}
						{m.type === "private" && "(prive)"} : {m.text}
						<span className="text-xs text-gray-500">
							{" "}
							({new Date(m.date).toLocaleTimeString()})
						</span>
					</div>
				))}
			</div>

			<form onSubmit={sendMessage} className="flex mb-4">
				<input
					value={input}
					onChange={(e) => setInput(e.target.value)}
				className="flex-grow px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-l-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
				placeholder={
					toUser ? `Message prive à ${toUser}` : "Message global"
				}
			/>
			<button className="bg-blue-600 text-white px-4 rounded-r">
				{t('common.send')}
			</button>
		</form>			<div className="flex gap-2">
				<button
					onClick={() => setToUser(null)}
					className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 hover:text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 border border-slate-600"
				>
					Global
				</button>
				<button
					onClick={() => setToUser(2)}
					className="bg-purple-600/50 hover:bg-purple-500/50 text-white px-3 py-2 rounded-lg font-medium transition-all duration-200"
				>
					MP → User 2
				</button>
				<button
					onClick={() => blockUser(2)}
					className="bg-red-600/70 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-medium transition-all duration-200"
				>
					Bloquer User 2
				</button>
				<button
					onClick={() => unblockUser(2)}
					className="bg-green-600/70 hover:bg-green-600 text-white px-3 py-2 rounded-lg font-medium transition-all duration-200"
				>
					Debloquer User 2
				</button>
			</div>

			{/* Context Menu */}
			{contextMenu && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={() => setContextMenu(null)}
					/>
					<div
						className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl py-2 min-w-[180px]"
						style={{ left: contextMenu.x, top: contextMenu.y }}
					>
						<button
							className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm text-slate-200 hover:text-white transition-colors duration-150"
							onClick={() => {
								console.log("[Chat] Navigation vers /user/ avec ID:", contextMenu.userId, "nom:", contextMenu.userName);
								navigate(`/user/${contextMenu.userId}`);
								setContextMenu(null);
							}}
						>
							👤 View Profile
						</button>
						<button
							className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm text-slate-200 hover:text-white transition-colors duration-150"
							onClick={() => {
								setToUser(contextMenu.userId);
								setContextMenu(null);
							}}
						>
							💬 Send Private Message
						</button>
						<button
							className="w-full text-left px-4 py-2 hover:bg-red-600/20 text-sm text-red-400 hover:text-red-300 transition-colors duration-150"
							onClick={() => {
								blockUser(contextMenu.userId);
								setContextMenu(null);
							}}
						>
							🚫 Block User
						</button>
					</div>
				</>
			)}
		</div>
	);
}
