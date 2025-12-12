import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useNavigate } from "react-router";
import { useUser } from "../contexts/UserContext";

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
        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full p-4 shadow-lg hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 border border-white/10"
      >
        <span className="text-xl">💬</span>
      </button>

      {open && (
        <div className="w-80 h-[32rem] bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl mt-4 flex flex-col border border-slate-700/50 relative overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-blue-900/80 to-slate-900/80 border-b border-slate-700/50">
            <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg">
              <button
                onClick={() => { setView("chat"); setTarget(null); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "chat"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                {t('chat.globalChat')}
              </button>
              <button
                onClick={() => setView("users")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "users"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                {t('chat.privateChat')}
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              ✖
            </button>
          </div>

          {/* Content */}
          {view === "chat" ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {messages
                .filter(msg => !target || msg.to === null || msg.to === user.id || msg.from?.id === user.id)
                .map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.from?.id === user.id ? "items-end" : "items-start"} mb-2`}>
                    {msg.type !== "info" && msg.from?.id !== user.id && (
                      <span className="text-[10px] font-bold text-blue-400 ml-2 mb-1 uppercase tracking-wider">
                        {msg.from?.name} {msg.type === "private" ? t('chat.private') : ""}
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm shadow-md backdrop-blur-sm border ${msg.type === "info"
                          ? "bg-yellow-500/20 border-yellow-500/30 text-yellow-100 italic text-center w-full my-1"
                          : msg.type === "private"
                            ? "bg-purple-500/20 border-purple-500/20 text-purple-100"
                            : msg.from?.id === user.id
                              ? "bg-blue-600 text-white border-blue-500/50 rounded-br-none"
                              : "bg-slate-700/50 text-gray-100 border-slate-600/50 rounded-bl-none"
                        }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              <div ref={bottomRef}></div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {users
                .filter(u => u.id !== user.id)
                .map(u => (
                  <div
                    key={u.id}
                    className="group flex flex-col mb-1 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all"
                    onContextMenu={(e) => handleContextMenu(e, u.id, u.name)}
                  >
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setTarget(u.id)}
                        className="flex items-center gap-3 text-left group-hover:translate-x-1 transition-transform"
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                        <span className={`text-sm font-medium ${u.blocked ? "text-gray-500 line-through" : "text-gray-200 group-hover:text-white"}`}>
                          {u.name}
                        </span>
                        {u.blocked && (
                          <span className="ml-2 text-[10px] text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-wider">
                            {t('chat.blocked')}
                          </span>
                        )}
                      </button>

                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!u.blocked && (
                          <button
                            onClick={() => handleInvite(u.id)}
                            className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded hover:bg-green-500 hover:text-white transition-all"
                            title={t('chat.inviteToPlay')}
                          >
                            {t('chat.invite')}
                          </button>
                        )}
                        {u.blocked ? (
                          <button onClick={() => unblockUser(u.id, u.name)} className="text-xs text-green-400 hover:underline">
                            {t('common.unblock')}
                          </button>
                        ) : (
                          <button onClick={() => blockUser(u.id, u.name)} className="text-xs text-red-400 hover:underline">
                            {t('common.block')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-slate-800/30 border-t border-slate-700/50 backdrop-blur-md">
            <div className="flex gap-2 relative">
              <input
                className="flex-1 bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                value={input}
                placeholder={
                  target
                    ? t('chat.messageTo', { name: users.find(u => u.id === target)?.name })
                    : t('chat.writePlaceholder')
                }
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed bg-slate-800 border border-slate-700 shadow-2xl rounded-xl py-1 z-[60] min-w-[140px] backdrop-blur-xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => goToProfile(contextMenu.userId)}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-colors"
          >
            <span>👤</span> {t('chat.viewProfile')}
          </button>
        </div>
      )}
    </div>
  );
}
