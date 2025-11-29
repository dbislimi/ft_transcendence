import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useBombPartyStore, type LobbyInfo } from "../../store/useBombPartyStore";
import { bombPartyService } from "../../services/bombPartyService";

interface LobbyListProps {
  onJoinLobby: (roomId: string, password?: string) => void;
  isAuthenticated: boolean;
  client?: any;
}

export default function LobbyList({ onJoinLobby, isAuthenticated, client }: LobbyListProps) {
  const { t } = useTranslation();
  const { lobbies, requestLobbyList, connection } = useBombPartyStore();
  const [selectedLobby, setSelectedLobby] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('[LobbyList] Lobbies updated:', lobbies.length, lobbies);
  }, [lobbies]);

  useEffect(() => {
    if (connection.state === 'connected' && connection.playerId) {
      console.log('[LobbyList] Connected, requesting lobby list');
      requestLobbyList();
    }
  }, [connection.state, connection.playerId, requestLobbyList]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPassword(prev => prev);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleJoinClick = (lobby: LobbyInfo) => {
    if (lobby.isPrivate) {
      setSelectedLobby(lobby.id);
      setPassword("");
    } else {
      onJoinLobby(lobby.id);
    }
  };

  const handlePasswordSubmit = () => {
    if (selectedLobby && password.trim()) {
      onJoinLobby(selectedLobby, password);
      setSelectedLobby(null);
      setPassword("");
    }
  };

  const handleCancelPassword = () => {
    setSelectedLobby(null);
    setPassword("");
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) 
      return t("bombParty.lobby.justNow");
    if (minutes < 60)
      return t("bombParty.lobby.minutesAgo").replace("{minutes}", minutes.toString());
    if (hours < 24)
      return t("bombParty.lobby.hoursAgo").replace("{hours}", hours.toString());
    return t("bombParty.lobby.daysAgo").replace("{days}", Math.floor(hours / 24).toString());
  };

  const getLobbyStatus = (lobby: LobbyInfo) => {
    if (lobby.isStarted)
      return t("bombParty.lobby.inProgress");
    if (lobby.players >= lobby.maxPlayers)
      return t("bombParty.lobby.full");
    return t("bombParty.lobby.waiting");
  };

  const getStatusColor = (lobby: LobbyInfo) => {
    if (lobby.isStarted)
      return "text-red-400";
    if (lobby.players >= lobby.maxPlayers)
      return "text-orange-400";
    return "text-green-400";
  };

  if (connection.state !== 'connected' || !connection.playerId) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">
            {connection.state === 'connecting' ? t("bombParty.lobby.connecting") : t("bombParty.lobby.connectionRequired")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">
          {t("bombParty.lobby.availableLobbies")} ({lobbies.length})
        </h3>
        <button
          onClick={() => {
            console.log('[LobbyList] Refresh button clicked, current lobbies:', lobbies.length);
            setIsLoading(true);
            console.log('[LobbyList] Requesting lobby list via service');
            requestLobbyList();
            if (client) {
              console.log('[LobbyList] Also requesting via client');
              client.emit('bp:lobby:list', {});
            }      
            setTimeout(() => {
              setIsLoading(false);
              const updatedLobbies = useBombPartyStore.getState().lobbies;
              console.log('[LobbyList] After refresh, lobbies:', updatedLobbies.length, updatedLobbies);
            }, 1500);
          }}
          disabled={isLoading}
          className="px-3 py-1 text-sm rounded border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-50">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            t("bombParty.lobby.refresh")
          )}
        </button>
      </div>

      {lobbies.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-2">{t("bombParty.lobby.noLobbies")}</p>
          <p className="text-sm text-slate-500">{t("bombParty.lobby.noLobbiesDesc")}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {lobbies.map((lobby) => (
            <div
              key={lobby.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                lobby.isStarted || lobby.players >= lobby.maxPlayers
                  ? "border-slate-600 bg-slate-700/30 opacity-60"
                  : "border-slate-600 bg-slate-700/60 hover:border-slate-500 hover:bg-slate-700/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-200">{lobby.name}</h4>
                    {lobby.isPrivate && (
                      <span className="px-2 py-1 text-xs rounded bg-purple-600/20 text-purple-300 border border-purple-500/30">
                        {t("bombParty.lobby.private")}
                      </span>
                    )}
                    <span className={`text-xs font-medium ${getStatusColor(lobby)}`}>
                      {getLobbyStatus(lobby)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>
                      {lobby.players}/{lobby.maxPlayers} {t('common.players')}
                    </span>
                    <span>•</span>
                    <span>{formatTimeAgo(lobby.createdAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleJoinClick(lobby)}
                  disabled={lobby.isStarted || lobby.players >= lobby.maxPlayers}
                  className={`px-4 py-2 rounded font-medium transition-all duration-200 ${
                    lobby.isStarted || lobby.players >= lobby.maxPlayers
                      ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white"
                  }`}
                >
                  {lobby.isStarted ? t("bombParty.lobby.inProgress") : lobby.players >= lobby.maxPlayers ? t("bombParty.lobby.full") : t("bombParty.lobby.join")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedLobby && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg border border-purple-500/30 p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">
              {t("bombParty.lobby.joinPrivate")}
            </h3>
            <p className="text-slate-400 mb-4">
              {t("bombParty.lobby.privatePasswordDesc")}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1">
                  {t("bombParty.lobby.password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("bombParty.lobby.enterPassword")}
                  className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordSubmit();
                    } else if (e.key === 'Escape') {
                      handleCancelPassword();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePasswordSubmit}
                  disabled={!password.trim()}
                  className={`flex-1 py-2 px-4 rounded font-medium transition-all duration-200 ${
                    password.trim()
                      ? "bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white"
                      : "bg-slate-600 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {t("bombParty.lobby.join")}
                </button>
                <button
                  onClick={handleCancelPassword}
                  className="px-4 py-2 rounded border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
                >
                  {t("bombParty.lobby.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
