import { useState, useRef, useEffect } from "react";
import { useWebSocket } from "../contexts/WebSocketContext";

export default function ChatWidget() {
  const savedUser = localStorage.getItem("user");
  const savedToken = localStorage.getItem("token");
  const { chatWsRef, pongWsRef, messages, users } = useWebSocket();

  if (!savedUser || !savedToken) return null;

  const parsedUser = JSON.parse(savedUser);
  const user = { ...parsedUser, id: Number(parsedUser.id) };

  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "users">("chat");
  const [target, setTarget] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Scroll automatique
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, view]);

  // Envoi de message
  const sendMessage = () => {
    if (!chatWsRef.current || chatWsRef.current.readyState !== WebSocket.OPEN || !input.trim()) return;

    chatWsRef.current.send(
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
    chatWsRef.current?.send(JSON.stringify({ type: "block", userId }));
    if (target === userId) setTarget(null);
  };

  const unblockUser = (userId: number) => {
    chatWsRef.current?.send(JSON.stringify({ type: "unblock", userId }));
  };

  const handleInvite = (friendId: number) => {
    if (pongWsRef.current && pongWsRef.current.readyState === WebSocket.OPEN) {
      pongWsRef.current.send(
        JSON.stringify({
          event: "invitation",
          body: {
            action: "invite",
            friendId: friendId,
          },
        })
      );
      console.log(`Invitation envoyée à l'utilisateur ${friendId}`);
    } else {
      console.error("WebSocket Pong non connecté");
    }
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
                  <div key={u.id} className="flex flex-col mb-2 border-b pb-2 last:border-0">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setTarget(u.id)}
                        className="text-left text-sm text-blue-700 hover:underline font-medium"
                      >
                        {u.name} {u.blocked ? "(bloqué)" : ""}
                      </button>
                      <div className="flex gap-2">
                        {!u.blocked && (
                          <button
                            onClick={() => handleInvite(u.id)}
                            className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition"
                            title="Inviter à jouer"
                          >
                            Inviter
                          </button>
                        )}
                        {u.blocked ? (
                          <button onClick={() => unblockUser(u.id)} className="text-xs text-green-600 hover:underline">
                            Débloquer
                          </button>
                        ) : (
                          <button onClick={() => blockUser(u.id)} className="text-xs text-red-600 hover:underline">
                            Bloquer
                          </button>
                        )}
                      </div>
                    </div>
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