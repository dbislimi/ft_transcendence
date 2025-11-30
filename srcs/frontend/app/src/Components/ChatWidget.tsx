import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useWebSocket } from "../context/WebSocketContext";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function ChatWidget() {
  const { t } = useTranslation();
  const { chatWsRef, pongWsRef, messages, users } = useWebSocket();
  const navigate = useNavigate();
  const { user, token } = useUser();

  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "users">("chat");
  const [target, setTarget] = useState<number | null>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; userId: number; userName: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, view]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  if (!user || !token) {
    return null;
  }

  const sendMessage = () => {
    if (!chatWsRef.current || chatWsRef.current.readyState !== WebSocket.OPEN || !input.trim()) return;

    chatWsRef.current.send(
      JSON.stringify({
        type: "message",
        text: input,
        to: target,
      })
    );
    setInput("");
  };

  const blockUser = (userId: number, userName: string) => {
    chatWsRef.current?.send(JSON.stringify({ type: "block", userId, name: userName }));
    if (target === userId) setTarget(null);
  };

  const unblockUser = (userId: number, userName: string) => {
    chatWsRef.current?.send(JSON.stringify({ type: "unblock", userId, name: userName }));
  };

  const handleInvite = (friendId: number) => {
    if (pongWsRef.current && pongWsRef.current.readyState === WebSocket.OPEN) {
      pongWsRef.current.send(
        JSON.stringify({
          event: "invitation",
          body: { action: "invite", friendId: friendId },
        })
      );
    }
  };

  const handleContextMenu = (e: React.MouseEvent, userId: number, userName: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      userId: userId,
      userName: userName
    });
  };

  const goToProfile = (userId: number) => {
    navigate(`/user/${userId}`);
    setOpen(false);
    setContextMenu(null);
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
        <div className="w-80 h-[26rem] bg-white dark:bg-gray-900 rounded-2xl shadow-xl mt-2 flex flex-col border border-gray-300 dark:border-gray-700 relative">
          <div className="flex justify-between items-center px-3 py-2 bg-blue-600 text-white rounded-t-2xl">
            <div className="flex gap-3">
              <button
                onClick={() => { setView("chat"); setTarget(null); }}
                className={`px-2 py-1 rounded ${view === "chat" ? "bg-blue-800" : "hover:bg-blue-700"}`}
              >
                {t('chat.globalChat')}
              </button>
              <button
                onClick={() => setView("users")}
                className={`px-2 py-1 rounded ${view === "users" ? "bg-blue-800" : "hover:bg-blue-700"}`}
              >
                {t('chat.privateChat')}
              </button>
            </div>
            <button onClick={() => setOpen(false)}>✖</button>
          </div>

          {view === "chat" ? (
            <div className="flex-1 overflow-y-auto p-3 text-sm bg-gray-50 dark:bg-gray-800">
              {messages
                .filter(msg => !target || msg.to === null || msg.to === user.id || msg.from.id === user.id)
                .map((msg, i) => (
                  <div key={i} className="flex flex-col mb-2 items-start">
                    {msg.type !== "info" && (
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 ml-1 mb-1">
                        {msg.from.name} {msg.type === "private" ? t('chat.private') : ""}
                      </span>
                    )}
                    <div
                      className={`${msg.type === "info"
                        ? "bg-yellow-100 dark:bg-yellow-800 italic"
                        : msg.type === "private"
                          ? "bg-purple-200 dark:bg-purple-700"
                          : "bg-gray-200 dark:bg-gray-700"
                        } px-3 py-2 rounded-xl text-black dark:text-white`}
                    >
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
                  <div
                    key={u.id}
                    className="flex flex-col mb-2 border-b pb-2 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded transition"
                    onContextMenu={(e) => handleContextMenu(e, u.id, u.name)}
                  >
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setTarget(u.id)}
                        className="text-left text-sm text-blue-700 hover:underline font-medium"
                      >
                        {u.name} {u.blocked ? t('chat.blocked') : ""}
                      </button>
                      <div className="flex gap-2">
                        {!u.blocked && (
                          <button
                            onClick={() => handleInvite(u.id)}
                            className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition"
                            title={t('chat.inviteToPlay')}
                          >
                            {t('chat.invite')}
                          </button>
                        )}
                        {u.blocked ? (
                          <button onClick={() => unblockUser(u.id, u.name)} className="text-xs text-green-600 hover:underline">
                            {t('common.unblock')}
                          </button>
                        ) : (
                          <button onClick={() => blockUser(u.id, u.name)} className="text-xs text-red-600 hover:underline">
                            {t('common.block')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div className="p-2 border-t flex gap-2">
            <input
              className="flex-1 border rounded-lg px-2 text-black dark:text-white dark:bg-gray-700"
              value={input}
              placeholder={
                target
                  ? t('chat.messageTo', { name: users.find(u => u.id === target)?.name })
                  : t('chat.writePlaceholder')
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

      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 border dark:border-gray-600 shadow-xl rounded-lg py-1 z-[60] min-w-[120px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => goToProfile(contextMenu.userId)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            👤 {t('chat.viewProfile')}
          </button>
        </div>
      )}
    </div>
  );
}