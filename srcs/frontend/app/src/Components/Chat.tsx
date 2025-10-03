import { useEffect, useState, useRef } from "react";

interface Message {
  from: number;
  fromName: string;
  text: string;
  date: string;
  type: "global" | "private" | "info";
  to?: number;
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:3000/chat?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => console.log(" WS ouvert");
    ws.onclose = () => console.log(" WS fermé");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (["global", "private", "info"].includes(data.type)) {
        setMessages((prev) => [...prev, data]);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (wsRef.current && input.trim()) {
      wsRef.current.send(
        JSON.stringify({ type: "message", text: input })
      );
      setInput("");
    }
  };

  return (
    <div className="fixed bottom-4 left-4 w-full max-w-md">
      <div className="mb-2 max-h-64 overflow-y-auto rounded-lg border p-3 bg-white shadow">
        {messages.map((m, i) => (
          <div key={i} className="mb-1 text-sm">
            <strong>{m.fromName}</strong> {m.type === "private" && "(privé)"}:{" "}
            {m.text}
            <span className="text-xs text-gray-500 ml-2">
              ({new Date(m.date).toLocaleTimeString()})
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border p-2 rounded-l"
          placeholder="Écrire un message..."
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 rounded-r"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
