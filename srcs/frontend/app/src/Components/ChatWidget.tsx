import { useEffect, useState, useRef } from "react";
import { getWebSocketHost } from "../config/api";

interface Message {
    type: "global" | "private" | "info";
    from?: number;
    fromName?: string;
    to?: number | null;
    text?: string;
    message?: string;
    date?: string;
}

interface User {
    id: number;
    name: string;
    blocked?: boolean;
}

export default function ChatWidget() {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");

    if (!savedUser || !savedToken) return null;

    const parsedUser = JSON.parse(savedUser);
    const user = { ...parsedUser, id: Number(parsedUser.id) };
    const token = savedToken;

    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [input, setInput] = useState("");
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<"chat" | "users">("chat");
    const [target, setTarget] = useState<number | null>(null);

    const bottomRef = useRef<HTMLDivElement | null>(null);

    // Connexion WebSocket
    useEffect(() => {
        // Always prefer Nginx proxy (port 443) over direct backend port (3001)
        // If on port 5173 (Vite), target localhost (Nginx).
        // If on port 443 (Nginx), target window.location.host.
        const wsHost = getWebSocketHost();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${wsHost}/chat?token=${token}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => console.log("WS connecté");
        ws.onclose = () => console.log("WS fermé");
        ws.onerror = (e) => console.error("WS erreur:", e);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Liste des users
                if (data.type === "users") {
                    setUsers(data.users);
                    return;
                }

                // Messages globaux ou privés
                if (data.type === "global" || data.type === "private" || data.type === "info") {
                    setMessages((prev) => [...prev, data]);
                }
            } catch (err) {
                console.error("Erreur parse WS:", err);
            }
        };

        setSocket(ws);
        return () => ws.close();
    }, [token]);

    // Scroll automatique
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Envoi de message
    const sendMessage = () => {
        if (!socket || socket.readyState !== WebSocket.OPEN || !input.trim()) return;

        socket.send(
            JSON.stringify({
                type: "message",
                text: input,
                to: target, // null = global, sinon ID du destinataire
            })
        );

        setInput("");
    };

    // Blocage
    const blockUser = (userId: number) => {
        socket?.send(JSON.stringify({ type: "block", userId }));
        setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, blocked: true } : u))
        );
        if (target === userId) setTarget(null);
    };

    const unblockUser = (userId: number) => {
        socket?.send(JSON.stringify({ type: "unblock", userId }));
        setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, blocked: false } : u))
        );
    };

    return (
        <div className="fixed bottom-4 left-4 z-50">
            <button
                onClick={() => setOpen((o) => !o)}
                className="bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition"
            >
                💬
            </button>

            {open && (
                <div className="w-80 h-[26rem] bg-white dark:bg-gray-900 rounded-2xl shadow-xl mt-2 flex flex-col border border-gray-300 dark:border-gray-700">
                    {/* HEADER */}
                    <div className="flex justify-between items-center px-3 py-2 bg-blue-600 text-white rounded-t-2xl">
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setView("chat"); setTarget(null); }}
                                className={`px-2 py-1 rounded ${view === "chat" ? "bg-blue-800" : "hover:bg-blue-700"}`}
                            >
                                Chat Global
                            </button>
                            <button
                                onClick={() => setView("users")}
                                className={`px-2 py-1 rounded ${view === "users" ? "bg-blue-800" : "hover:bg-blue-700"}`}
                            >
                                Chat Privé
                            </button>
                        </div>
                        <button onClick={() => setOpen(false)}>✖</button>
                    </div>

                    {/* CONTENU */}
                    {view === "chat" ? (
                        <div className="flex-1 overflow-y-auto p-3 text-sm bg-gray-50 dark:bg-gray-800">
                            {messages
                                .filter(msg => !target || msg.to === null || msg.to === user.id || msg.from === user.id)
                                .map((msg, i) => (
                                    <div key={i} className="flex flex-col mb-2 items-start">
                                        <div
                                            className={`${msg.type === "info"
                                                ? "bg-yellow-100 dark:bg-yellow-800 italic"
                                                : msg.type === "private"
                                                    ? "bg-purple-200 dark:bg-purple-700"
                                                    : "bg-gray-200 dark:bg-gray-700"
                                                } px-3 py-2 rounded-xl`}
                                        >
                                            {msg.type !== "info" && (
                                                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                                    {msg.fromName} {msg.type === "private" ? "(privé)" : ""}
                                                </span>
                                            )}
                                            <div>{msg.text ?? msg.message}</div>
                                        </div>
                                    </div>
                                ))}
                            <div ref={bottomRef}></div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-3 text-sm bg-gray-50 dark:bg-gray-800">
                            {users
                                .filter(u => u.id !== user.id)
                                .map(u => (
                                    <div key={u.id} className="flex justify-between items-center mb-2">
                                        <button
                                            onClick={() => setTarget(u.id)}
                                            className="text-left text-sm text-blue-700 hover:underline"
                                        >
                                            {u.name} {u.blocked ? "(bloqué)" : ""}
                                        </button>
                                        {u.blocked ? (
                                            <button onClick={() => unblockUser(u.id)} className="text-green-600 hover:underline">
                                                Débloquer
                                            </button>
                                        ) : (
                                            <button onClick={() => blockUser(u.id)} className="text-red-600 hover:underline">
                                                Bloquer
                                            </button>
                                        )}
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* INPUT */}
                    <div className="p-2 border-t flex gap-2">
                        <input
                            className="flex-1 border rounded-lg px-2"
                            value={input}
                            placeholder={
                                target
                                    ? `Message à ${users.find(u => u.id === target)?.name}`
                                    : "Écrire..."
                            }
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendMessage()}
                        />
                        <button onClick={sendMessage} className="bg-blue-600 text-white px-3 rounded-lg">
                            ➤
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
