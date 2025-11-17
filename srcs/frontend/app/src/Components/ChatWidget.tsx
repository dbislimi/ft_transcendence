import { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

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
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "users">("chat"); // onglets
  const [target, setTarget] = useState<number | null>(null); // destinataire privé
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Connexion WebSocket
  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:3001/chat?token=${token}`);
    ws.onopen = () => console.log("✅ Chat connecté");
    ws.onclose = () => console.log("❌ Chat déconnecté");
    ws.onerror = (e) => console.error("⚠️ WS erreur :", e);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("en vrai 3echek montre t'a quoi en bien : ", data.users);

        // Mise à jour de la liste des utilisateurs en ligne
        if (data.type === "users") {
          setUsers(data.users);
          return;
        }

        setMessages((prev) => [...prev, data]);
      } catch (e) {
        console.error("Erreur WS:", e);
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, [token]);

  // Scroll automatique
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !input.trim()) return;

    const msg = { type: "message", text: input, to: target };
    socket.send(JSON.stringify(msg));
    setInput("");
  };

  const blockUser = (userId: number) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "block", userId }));
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, blocked: true } : u))
    );
    if (target === userId) setTarget(null);
  };

  const unblockUser = (userId: number) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "unblock", userId }));
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, blocked: false } : u))
    );
  };

  if (!user) return null;
  console.log("user.id : ", user.id);
  console.log("user.id : ", user);


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
          {/* En-tête avec onglets */}
          <div className="flex justify-between items-center px-3 py-2 bg-blue-600 text-white rounded-t-2xl">
            <div className="flex gap-3">
              <button
                onClick={() => setView("chat")}
                className={`px-2 py-1 rounded ${
                  view === "chat" ? "bg-blue-800" : "hover:bg-blue-700"
                }`}
              >
                Chat Global
              </button>
              <button
                onClick={() => setView("users")}
                className={`px-2 py-1 rounded ${
                  view === "users" ? "bg-blue-800" : "hover:bg-blue-700"
                }`}
              >
                
                chat privé
              </button>
            </div>
            <button onClick={() => setOpen(false)} className="hover:text-gray-200">
              ✖
            </button>
          </div>

          {/* Contenu selon onglet */}
          {view === "chat" ? (
            <div className="flex-1 overflow-y-auto p-3 text-sm bg-gray-50 dark:bg-gray-800">
              {messages.map((msg, i) => {
                const isInfo = msg.type === "info";
                return (
                  <div key={i} className="flex flex-col mb-2 items-start">
                    <div
                      className={`${
                        isInfo
                          ? "bg-yellow-100 text-gray-700 dark:bg-yellow-800 dark:text-gray-100 italic"
                          : msg.type === "private"
                          ? "bg-purple-200 text-gray-900 dark:bg-purple-700 dark:text-white"
                          : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                      } px-3 py-2 rounded-xl max-w-[90%]`}
                    >
                      {!isInfo && (
                        <span className="block text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                          {msg.fromName ?? "Système"}
                          {msg.type === "private" ? " (privé)" : ""}
                        </span>
                      )}
                      <span>{msg.text ?? msg.message}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef}></div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 text-sm bg-gray-50 dark:bg-gray-800">
              {users
                .filter((u) => u.id !== Number(user.id))
                .map((u) => (
                  <div key={u.id} className="flex justify-between items-center mb-2">
                    <button
                      onClick={() => setTarget(u.id)}
                      className="text-left text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline"
                    >
                      {u.name} {u.blocked ? "(bloqué)" : ""}
                    </button>
                    {u.blocked ? (
                      <button
                        onClick={() => unblockUser(u.id)}
                        className="text-sm text-green-600 dark:text-green-400 hover:underline px-1"
                      >
                        Débloquer
                      </button>
                    ) : (
                      <button
                        onClick={() => blockUser(u.id)}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline px-1"
                      >
                        Bloquer
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Champ de saisie */}
          <div className="p-2 border-t border-gray-300 dark:border-gray-700 flex gap-2">
            <input
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                         placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={
                target
                  ? `Message privé à ${users.find((u) => u.id === target)?.name ?? "?"}...`
                  : "Écrire un message..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white rounded-lg px-3 hover:bg-blue-700 transition"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
