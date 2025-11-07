import { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

interface Message {
  type: "global" | "private" | "info";
  fromName?: string;
  text?: string;
  message?: string;
  date?: string;
}

export default function ChatWidget() {
  const { token, user } = useAuth(); // on suppose que ton AuthContext fournit ces infos
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
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
        setMessages((prev) => [...prev, data]);
      } catch (e) {
        console.error("Erreur WS:", e);
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, [token]);

  // Scroll automatique vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!socket || !input.trim()) return;
    socket.send(JSON.stringify({ type: "message", text: input }));
    setInput("");
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Bouton pour ouvrir/fermer le chat */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition"
      >

      </button>

      {/* Fenêtre du chat */}
      {open && (
        <div className="w-80 h-96 bg-white rounded-2xl shadow-xl mt-2 flex flex-col border border-gray-300">
          <div className="flex justify-between items-center px-3 py-2 bg-blue-600 text-white rounded-t-2xl">
            <span>Chat Global</span>
            <button onClick={() => setOpen(false)}>✖</button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 text-sm">
            {messages.map((msg, i) => (
              <div key={i} className="mb-1">
                {msg.type === "info" ? (
                  <p className="text-gray-500 italic">{msg.message}</p>
                ) : (
                  <p>
                    <span className="font-bold text-blue-700">
                      {msg.fromName ?? "Système"}:
                    </span>{" "}
                    {msg.text}
                  </p>
                )}
              </div>
            ))}
            <div ref={bottomRef}></div>
          </div>

          <div className="p-2 border-t flex gap-2">
            <input
              className="flex-1 border rounded-lg px-2 py-1"
              placeholder="Écrire un message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white rounded-lg px-3"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}