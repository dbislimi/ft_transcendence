import { useEffect, useState } from 'react';

interface Message {
  from: string;
  text: string;
  date: string;
  type: "global" | "private";
  to?: number;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [toUser, setToUser] = useState<number | null>(null); // null = global
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("le token en question pitie AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA: ", token);
    if (!token) return;

    const socket = new WebSocket("ws://localhost:3000/chat", token);
    setWs(socket);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (["global", "private"].includes(data.type)) {
        setMessages((prev) => [...prev, data]);
      }
    };

    return () => socket.close();
  }, []);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (ws && input.trim()) {
      ws.send(JSON.stringify({ type: "message", text: input, to: toUser }));
      setInput("");
    }
  };

  const blockUser = (userId: number) => {
    ws?.send(JSON.stringify({ type: "block", userId }));
  };

  const unblockUser = (userId: number) => {
    ws?.send(JSON.stringify({ type: "unblock", userId }));
  };

  return (
    <div className="p-4 border rounded bg-white shadow w-full max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-2">💬 Chat</h2>

      <div className="h-64 overflow-y-auto border p-2 mb-2 bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className="mb-1">
            <strong>{m.from}</strong> {m.type === "private" && "(privé)"} : {m.text}
            <span className="text-xs text-gray-500"> ({new Date(m.date).toLocaleTimeString()})</span>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="flex mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border flex-grow p-2 rounded-l"
          placeholder={toUser ? `Message privé à ${toUser}` : "Message global"}
        />
        <button className="bg-blue-600 text-white px-4 rounded-r">Envoyer</button>
      </form>

      <div className="flex gap-2">
        <button onClick={() => setToUser(null)} className="bg-gray-300 px-2 py-1 rounded">
          Global
        </button>
        <button onClick={() => setToUser(2)} className="bg-gray-300 px-2 py-1 rounded">
          MP → User 2
        </button>
        <button onClick={() => blockUser(2)} className="bg-red-500 text-white px-2 py-1 rounded">
          Bloquer User 2
        </button>
        <button onClick={() => unblockUser(2)} className="bg-green-500 text-white px-2 py-1 rounded">
          Débloquer User 2
        </button>
      </div>
    </div>
  );
}