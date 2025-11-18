import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useWebSocket } from "../context/WebSocketContext";
import SpaceBackground from "../Components/SpaceBackground";

interface Friend {
  id: number;
  display_name: string;
  avatar?: string;
  online?: number | boolean;
}

interface FriendRequest {
  sender_id: number;
  display_name: string;
  avatar?: string;
  status: string;
  type: "sent" | "received";
}

interface BlockedUser {
  id: number;
  display_name: string;
  avatar?: string;
  created_at: string;
}

interface Stats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  botWins: number;
  playerWins: number;
  tournamentsWon: number;
}

interface Match {
  id: number;
  opponent: {
    name: string;
    avatar: string;
    isBot: boolean;
  };
  isWinner: boolean;
  scores: number[] | null;
  date: string;
  matchType?: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshUser, token } = useUser();
  const { friendsWsRef } = useWebSocket();
  const [activeTab, setActiveTab] = useState("overview");
  const [friendsSubTab, setFriendsSubTab] = useState<"list" | "requests" | "blocked">("list");
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [editMode, setEditMode] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("/avatars/avatar1.png");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [stats, setStats] = useState<Stats>({
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    botWins: 0,
    playerWins: 0,
    tournamentsWon: 0
  });

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [newFriend, setNewFriend] = useState("");
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<string>("Déconnecté");
  
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  const avatars = [
    "/avatars/avatar1.png", "/avatars/avatar2.png", "/avatars/avatar3.png",
    "/avatars/avatar4.png", "/avatars/avatar5.png", "/avatars/avatar6.png",
    "/avatars/avatar7.png", "/avatars/avatar8.png", "/avatars/avatar9.png",
    "/avatars/avatar10.png"
  ];

  const fetchFriends = async () => {
    try {
      const res = await fetch("http://localhost:3000/friends", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des amis:", err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch("http://localhost:3000/friend-requests", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des demandes:", err);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const res = await fetch("http://localhost:3000/blocked-users", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedUsers(data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des utilisateurs bloqués:", err);
    }
  };

  const fetchMatchHistory = async (page = 1) => {
    if (!token || !user) return;
    
    setHistoryLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/match-history/${user.id}?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const matches = await res.json();
        if (page === 1) {
          setMatchHistory(matches);
        } else {
          setMatchHistory(prev => [...prev, ...matches]);
        }
        setHasMoreHistory(matches.length === 10);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!token || !user) return;
    
    try {
      const res = await fetch(`http://localhost:3000/api/user-stats/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const userStats = await res.json();
        
        setStats({
          ...userStats
        });
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des stats:", error);
    }
  };

  const fetchData = async () => {
    if (!token || !user) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchFriends(),
        fetchRequests(),
        fetchBlockedUsers(),
        fetchUserStats(),
        fetchMatchHistory()
      ]);
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreHistory = () => {
    if (!historyLoading && hasMoreHistory) {
      const nextPage = historyPage + 1;
      setHistoryPage(nextPage);
      fetchMatchHistory(nextPage);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const sendRequest = async () => {
    if (!newFriend.trim()) return;
    
    setFriendsLoading(true);
    setFriendsError(null);

    try {
      const res = await fetch("http://localhost:3000/friend-requests", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ display_name: newFriend.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setNewFriend("");
        fetchRequests();
      } else {
        setFriendsError(data.error || "Erreur lors de l'envoi de la demande");
      }
    } catch (err) {
      setFriendsError("Erreur réseau");
    } finally {
      setFriendsLoading(false);
    }
  };

  const acceptRequest = async (senderId: number) => {
    try {
      const res = await fetch(`http://localhost:3000/friend-requests/${senderId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchFriends();
        fetchRequests();
      } else {
        const data = await res.json();
        setFriendsError(data.error || "Erreur lors de l'acceptation");
      }
    } catch (err) {
      setFriendsError("Erreur réseau");
    }
  };

  const rejectRequest = async (senderId: number) => {
    try {
      const res = await fetch(`http://localhost:3000/friend-requests/${senderId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchRequests();
      } else {
        const data = await res.json();
        setFriendsError(data.error || "Erreur lors du rejet");
      }
    } catch (err) {
      setFriendsError("Erreur réseau");
    }
  };

  const removeFriend = async (friendId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet ami ?")) return;

    try {
      const res = await fetch(`http://localhost:3000/friends/${friendId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchFriends();
      } else {
        const data = await res.json();
        setFriendsError(data.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      setFriendsError("Erreur réseau");
    }
  };

  const blockUser = async (userId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir bloquer cet utilisateur ?")) return;

    try {
      const res = await fetch("http://localhost:3000/block-user", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (res.ok) {
        fetchFriends();
        fetchRequests();
        fetchBlockedUsers();
      } else {
        const data = await res.json();
        setFriendsError(data.error || "Erreur lors du blocage");
      }
    } catch (err) {
      setFriendsError("Erreur réseau");
    }
  };

  const unblockUser = async (userId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir débloquer cet utilisateur ?")) return;

    try {
      const res = await fetch(`http://localhost:3000/blocked-users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchBlockedUsers();
      } else {
        const data = await res.json();
        setFriendsError(data.error || "Erreur lors du déblocage");
      }
    } catch (err) {
      setFriendsError("Erreur réseau");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !friendsLoading) {
      sendRequest();
    }
  };

  const isOnline = (v?: number | boolean) => v === true || v === 1;

  useEffect(() => {
    if (!token || !user?.id || !friendsWsRef.current) return;

    const ws = friendsWsRef.current;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            setWsStatus("Connecté");
            break;
          
          case "friend_request_received":
            fetchRequests();
            break;
          
          case "friend_request_accepted":
            fetchFriends();
            fetchRequests();
            break;
          
          case "friend_request_rejected":
            fetchRequests();
            break;
          
          case "friend_removed":
            fetchFriends();
            break;
          
          case "user_blocked":
            fetchFriends();
            fetchRequests();
            break;
          
          case "status_update":
            setFriends(prev => prev.map(friend => 
              friend.id === data.userId 
                ? { ...friend, online: data.online }
                : friend
            ));
            break;
          
          case "heartbeat":
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "pong" }));
            }
            break;
        }
      } catch (err) {
        console.error("Erreur parsing message WebSocket:", err);
      }
    };

    if (ws.readyState === WebSocket.OPEN) {
      setWsStatus("Connecté");
    }

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [token, user?.id, friendsWsRef]);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setDisplayName(user.display_name || "");
      setAvatar(user.avatar || "/avatars/avatar1.png");
      fetchData();
    }
    setIsLoaded(true);
  }, [user, token]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateDisplayName = (pseudo: string) => /^[a-zA-Z0-9-]+$/.test(pseudo);
  const validatePassword = (password: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{6,}$/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = {};

    if (email && email !== user?.email) {
      if (!validateEmail(email)) {
        setIsError(true);
        setMessage("Email invalide.");
        return;
      }
      body.email = email;
    }

    if (displayName && displayName !== user?.display_name) {
      if (!validateDisplayName(displayName)) {
        setIsError(true);
        setMessage("Le pseudo ne doit contenir que des lettres, chiffres ou tirets.");
        return;
      }
      body.display_name = displayName;
    }

    if (password) {
      if (!validatePassword(password)) {
        setIsError(true);
        setMessage("Le mot de passe doit contenir au moins 6 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.");
        return;
      }
      body.password = password;
    }

    if (avatar && avatar !== user?.avatar) {
      body.avatar = avatar;
    }

    if (Object.keys(body).length === 0) {
      setIsError(true);
      setMessage("Aucune modification détectée.");
      return;
    }

    if (!token) {
      navigate("/Connection");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setIsError(false);
        setMessage("Profil mis à jour avec succès");
        setPassword("");
        setEditMode(false);
        await refreshUser();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setIsError(true);
        setMessage(data.error || "Erreur lors de la mise à jour");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setIsError(true);
      setMessage("Erreur réseau. Veuillez réessayer.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (!user) {
    return (
      <>
        <SpaceBackground />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Chargement du profil...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SpaceBackground />
      <div className="relative min-h-screen overflow-hidden">
        <div className={`relative z-10 min-h-screen transition-all duration-1000 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            
            {/* Header du profil */}
            <div className="bg-gradient-to-r from-slate-800/80 via-purple-900/80 to-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/20 p-8 mb-8 shadow-2xl">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400/20 via-purple-400/20 to-pink-400/20 rounded-full blur-xl animate-pulse"></div>
                  <img
                    src={user.avatar || "/avatars/avatar1.png"}
                    alt="Avatar"
                    className="relative w-32 h-32 rounded-full border-4 border-purple-500/50 object-cover shadow-2xl"
                  />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-slate-800 flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 mb-2">
                    {user.display_name}
                  </h1>
                  <p className="text-xl text-gray-400 mb-4">{user.display_name}</p>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <div className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border border-emerald-500/30 rounded-lg px-4 py-2">
                      <span className="text-emerald-300 font-semibold">{stats.winRate}% WR</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/Dashboard")}
                  className="group relative overflow-hidden rounded-lg px-6 py-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-cyan-600/0 group-hover:from-blue-600/20 group-hover:to-cyan-600/20 transition-all duration-300"></div>
                  <span className="relative text-blue-300 group-hover:text-blue-200 font-semibold transition-colors duration-300">
                    🏠 Retour
                  </span>
                </button>
              </div>
            </div>

            {/* Navigation par onglets */}
            <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 mb-8 shadow-2xl">
              <div className="flex flex-wrap">
                {[
                  { id: "overview", label: "Vue d'ensemble", icon: "📊" },
                  { id: "stats", label: "Statistiques", icon: "🏆" },
                  { id: "history", label: "Historique", icon: "📜" },
                  { id: "friends", label: "Amis", icon: "👥" },
                  { id: "settings", label: "Paramètres", icon: "⚙️" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-0 px-6 py-4 font-semibold transition-all duration-300 rounded-xl m-2 ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/50 text-purple-200"
                        : "text-gray-400 hover:text-gray-200 hover:bg-slate-700/50"
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu des onglets */}
            <div className="space-y-8">
              
              {/* Vue d'ensemble */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-6">
                      🎯 Statistiques rapides
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-lg border border-blue-500/30">
                        <div className="text-3xl font-bold text-blue-300">{stats.totalGames}</div>
                        <div className="text-gray-400">Parties jouées</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-lg border border-green-500/30">
                        <div className="text-3xl font-bold text-green-300">{stats.wins}</div>
                        <div className="text-gray-400">Victoires</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-r from-red-600/20 to-pink-600/20 rounded-lg border border-red-500/30">
                        <div className="text-3xl font-bold text-red-300">{stats.losses}</div>
                        <div className="text-gray-400">Défaites</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">
                      👥 Amis en ligne
                    </h3>
                    <div className="space-y-3">
                      {friends.filter(f => isOnline(f.online)).slice(0, 4).map((friend) => (
                        <div key={friend.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600/30">
                          <div className="relative">
                            <img src={friend.avatar} alt={friend.display_name} className="w-10 h-10 rounded-full" />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800"></div>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-medium">{friend.display_name}</div>
                            <div className="text-green-400 text-sm">{isOnline(friend.online) ? "En ligne" : "Hors ligne"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Statistiques détaillées */}
              {activeTab === "stats" && (
                <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
                  <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-8">
                    🏆 Statistiques détaillées
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    {[
                      { label: "Parties totales", value: stats.totalGames, color: "blue", icon: "🎮" },
                      { label: "Taux de victoire", value: `${stats.winRate}%`, color: "green", icon: "📈" },
                      { label: "Victoires contre bots", value: stats.botWins, color: "purple", icon: "🤖" },
                      { label: "Victoires contre joueurs", value: stats.playerWins, color: "yellow", icon: "👥" },
                      { label: "Tournois gagnés", value: stats.tournamentsWon, color: "orange", icon: "🏆" }
                    ].map((stat, index) => (
                      <div key={index} className={`text-center p-6 bg-gradient-to-r from-${stat.color}-600/20 to-${stat.color}-500/20 rounded-xl border border-${stat.color}-500/30`}>
                        <div className="text-4xl mb-2">{stat.icon}</div>
                        <div className={`text-3xl font-bold text-${stat.color}-300 mb-1`}>{stat.value}</div>
                        <div className="text-gray-400 text-sm">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historique des parties */}
              {activeTab === "history" && (
                <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
                  <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-8">
                    📜 Historique des parties
                  </h3>

                  <div className="space-y-4">
                    {matchHistory.length > 0 ? (
                      <>
                        {matchHistory.map((match) => (
                          <div key={match.id} className={`p-6 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                            match.isWinner 
                              ? "bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30 hover:border-green-400/50"
                              : "bg-gradient-to-r from-red-600/20 to-pink-600/20 border-red-500/30 hover:border-red-400/50"
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  {match.opponent.isBot ? (
                                    <div className="w-16 h-16 rounded-full border-2 border-slate-600 bg-gradient-to-br from-orange-600/20 to-red-600/20 flex items-center justify-center">
                                      <span className="text-2xl">🤖</span>
                                    </div>
                                  ) : (
                                    <img 
                                      src={match.opponent.avatar || "/avatars/avatar1.png"} 
                                      alt={match.opponent.name}
                                      className="w-16 h-16 rounded-full border-2 border-slate-600 object-cover"
                                    />
                                  )}
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-2xl ${match.isWinner ? "text-green-400" : "text-red-400"}`}>
                                      {match.isWinner ? "🏆" : "💔"}
                                    </span>
                                    <span className={`font-bold text-lg ${match.isWinner ? "text-green-300" : "text-red-300"}`}>
                                      {match.isWinner ? "VICTOIRE" : "DÉFAITE"}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-gray-300">
                                    <span className="text-white font-medium">vs {match.opponent.name}</span>
                                    {match.opponent.isBot && (
                                      <span className="px-2 py-1 bg-orange-600/20 text-orange-300 rounded-md text-xs border border-orange-500/30">
                                        BOT
                                      </span>
                                    )}
                                    {match.matchType === 'tournament' && (
                                      <span className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded-md text-xs border border-purple-500/30">
                                        🏆 TOURNOI
                                      </span>
                                    )}
                                    {match.matchType === 'quick' && !match.opponent.isBot && (
                                      <span className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded-md text-xs border border-blue-500/30">
                                        ⚡ RAPIDE
                                      </span>
                                    )}
                                    {match.matchType === 'offline' && match.opponent.isBot && (
                                      <span className="px-2 py-1 bg-green-600/20 text-green-300 rounded-md text-xs border border-green-500/30">
                                        🎯 ENTRAINEMENT
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="text-sm text-gray-400 mt-1">
                                    {formatDate(match.date)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                {match.scores && (
                                  <div className={`text-2xl font-bold mb-2 ${match.isWinner ? "text-green-300" : "text-red-300"}`}>
                                    {match.scores[0]} - {match.scores[1]}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 text-sm">Match #{match.id}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {hasMoreHistory && (
                          <div className="flex justify-center mt-8">
                            <button
                              onClick={loadMoreHistory}
                              disabled={historyLoading}
                              className="px-6 py-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-300 rounded-lg border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {historyLoading ? (
                                <span className="flex items-center gap-2">
                                  <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                                  Chargement...
                                </span>
                              ) : (
                                "📜 Charger plus de parties"
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-16 text-gray-400">
                        <div className="text-8xl mb-6">🎮</div>
                        <h4 className="text-2xl font-bold text-gray-300 mb-2">Aucune partie jouée</h4>
                        <p className="text-lg mb-4">Votre historique de parties apparaîtra ici</p>
                        <button
                          onClick={() => navigate("/pong")}
                          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                          🎯 Jouer ma première partie
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Liste des amis avec toutes les fonctionnalités */}
              {activeTab === "friends" && (
                <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
                  <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-8">
                    👥 Gestion des amis
                  </h3>

                  {friendsError && (
                    <div className="mb-6 p-4 rounded-lg border bg-red-500/10 border-red-500/30 text-red-400">
                      <div className="flex justify-between items-center">
                        <span>{friendsError}</span>
                        <button 
                          onClick={() => setFriendsError(null)}
                          className="text-red-300 hover:text-red-200"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Navigation des sous-onglets */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {[
                      { id: "list", label: `Amis (${friends.length})`, icon: "👥" },
                      { id: "requests", label: `Demandes (${requests.length})`, icon: "📩" },
                      { id: "blocked", label: `Bloqués (${blockedUsers.length})`, icon: "🚫" }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setFriendsSubTab(tab.id as any)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                          friendsSubTab === tab.id
                            ? "bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-500/50 text-blue-200"
                            : "text-gray-400 hover:text-gray-200 hover:bg-slate-700/50"
                        }`}
                      >
                        <span className="mr-2">{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Liste des amis */}
                  {friendsSubTab === "list" && (
                    <div className="space-y-6">
                      {/* Ajouter un ami */}
                      <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
                        <h4 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-4">
                          ➕ Ajouter un ami
                        </h4>
                        <div className="flex gap-3">
                          <input 
                            value={newFriend} 
                            onChange={e => setNewFriend(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Nom d'utilisateur" 
                            className="flex-1 px-4 py-3 bg-slate-600/50 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                            disabled={friendsLoading}
                          />
                          <button 
                            onClick={sendRequest} 
                            disabled={friendsLoading || !newFriend.trim()}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          >
                            {friendsLoading ? "⏳" : "📤"}
                          </button>
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                          Entrez le nom d'utilisateur exact de la personne que vous souhaitez ajouter.
                        </p>
                      </div>

                      {/* Liste des amis */}
                      <div className="space-y-4">
                        {friends.length > 0 ? (
                          friends.map((friend) => (
                            <div key={friend.id} className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <img 
                                    src={friend.avatar || "/avatars/avatar1.png"} 
                                    alt={friend.display_name}
                                    className="w-16 h-16 rounded-full border-2 border-slate-600 object-cover"
                                  />
                                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${isOnline(friend.online) ? 'bg-green-500' : 'bg-gray-500'} rounded-full border-2 border-slate-800`}></div>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-lg font-bold text-white">{friend.display_name}</h4>
                                  <p className={`text-sm ${isOnline(friend.online) ? 'text-green-400' : 'text-gray-500'}`}>
                                    {isOnline(friend.online) ? "🟢 En ligne" : "⚫ Hors ligne"}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  {isOnline(friend.online) && (
                                    <button 
                                      onClick={() => navigate(`/pong?invite=${friend.id}`)}
                                      className="px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-300 rounded-lg border border-purple-500/30 hover:border-purple-400/50 transition-all duration-200 font-medium"
                                    >
                                      🎮 Inviter à jouer
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => blockUser(friend.id)}
                                    className="px-4 py-2 bg-orange-600/20 text-orange-300 rounded-lg border border-orange-500/30 hover:border-orange-400/50 transition-all duration-200 font-medium"
                                  >
                                    🚫 Bloquer
                                  </button>
                                  <button 
                                    onClick={() => removeFriend(friend.id)}
                                    className="px-4 py-2 bg-red-600/20 text-red-300 rounded-lg border border-red-500/30 hover:border-red-400/50 transition-all duration-200 font-medium"
                                  >
                                    🗑️ Supprimer
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 text-gray-400">
                            <div className="text-6xl mb-4">👻</div>
                            <p className="text-lg">Aucun ami pour l'instant</p>
                            <p className="text-sm">Commencez par ajouter quelqu'un !</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Demandes d'amis */}
                  {friendsSubTab === "requests" && (
                    <div className="space-y-6">
                      {/* Demandes reçues */}
                      <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
                        <h4 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-4">
                          📥 Demandes reçues ({requests.filter(r => r.type === "received").length})
                        </h4>
                        <div className="space-y-3">
                          {requests.filter(r => r.type === "received").length > 0 ? (
                            requests.filter(r => r.type === "received").map(r => (
                              <div key={r.sender_id} className="flex items-center justify-between p-4 bg-slate-600/50 rounded-lg border border-slate-500/30">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={r.avatar || "/avatars/avatar1.png"} 
                                    alt={r.display_name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-500"
                                  />
                                  <span className="font-medium text-white">{r.display_name}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => acceptRequest(r.sender_id)} 
                                    className="px-3 py-2 bg-green-600/20 text-green-300 rounded-lg border border-green-500/30 hover:border-green-400/50 transition-all duration-200 font-medium"
                                  >
                                    ✅ Accepter
                                  </button>
                                  <button 
                                    onClick={() => rejectRequest(r.sender_id)} 
                                    className="px-3 py-2 bg-gray-600/20 text-gray-300 rounded-lg border border-gray-500/30 hover:border-gray-400/50 transition-all duration-200 font-medium"
                                  >
                                    ❌ Refuser
                                  </button>
                                  <button 
                                    onClick={() => blockUser(r.sender_id)} 
                                    className="px-3 py-2 bg-red-600/20 text-red-300 rounded-lg border border-red-500/30 hover:border-red-400/50 transition-all duration-200 font-medium"
                                  >
                                    🚫 Bloquer
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              <div className="text-4xl mb-2">📪</div>
                              <p>Aucune demande reçue</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Demandes envoyées */}
                      <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
                        <h4 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-4">
                          📤 Demandes envoyées ({requests.filter(r => r.type === "sent").length})
                        </h4>
                        <div className="space-y-3">
                          {requests.filter(r => r.type === "sent").length > 0 ? (
                            requests.filter(r => r.type === "sent").map(r => (
                              <div key={r.sender_id} className="flex items-center justify-between p-4 bg-slate-600/50 rounded-lg border border-slate-500/30">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={r.avatar || "/avatars/avatar1.png"} 
                                    alt={r.display_name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-500"
                                  />
                                  <span className="font-medium text-white">{r.display_name}</span>
                                </div>
                                <span className="text-yellow-400 font-medium flex items-center gap-2">
                                  <div className="animate-pulse w-2 h-2 bg-yellow-400 rounded-full"></div>
                                  En attente...
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              <div className="text-4xl mb-2">📭</div>
                              <p>Aucune demande envoyée</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Utilisateurs bloqués */}
                  {friendsSubTab === "blocked" && (
                    <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
                      <h4 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400 mb-4">
                        🚫 Utilisateurs bloqués ({blockedUsers.length})
                      </h4>
                      <div className="space-y-3">
                        {blockedUsers.length > 0 ? (
                          blockedUsers.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-4 bg-slate-600/50 rounded-lg border border-slate-500/30">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={u.avatar || "/avatars/avatar1.png"} 
                                  alt={u.display_name}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-500 opacity-50"
                                />
                                <div>
                                  <span className="font-medium text-white">{u.display_name}</span>
                                  <div className="text-sm text-gray-400">
                                    Bloqué le {new Date(u.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <button 
                                onClick={() => unblockUser(u.id)} 
                                className="px-4 py-2 bg-blue-600/20 text-blue-300 rounded-lg border border-blue-500/30 hover:border-blue-400/50 transition-all duration-200 font-medium"
                              >
                                🔓 Débloquer
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            <div className="text-4xl mb-2">🕊️</div>
                            <p>Aucun utilisateur bloqué</p>
                            <p className="text-sm">Vous êtes en paix avec tout le monde !</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Paramètres du profil */}
              {activeTab === "settings" && (
                <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-400">
                      ⚙️ Paramètres du profil
                    </h3>
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                        editMode 
                          ? "bg-red-600/20 text-red-300 border border-red-500/30 hover:border-red-400/50"
                          : "bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:border-blue-400/50"
                      }`}
                    >
                      {editMode ? "❌ Annuler" : "✏️ Modifier"}
                    </button>
                  </div>

                  {message && (
                    <div className={`mb-6 p-4 rounded-lg border ${
                      isError 
                        ? "bg-red-600/20 border-red-500/30 text-red-300" 
                        : "bg-green-600/20 border-green-500/30 text-green-300"
                    }`}>
                      {message}
                    </div>
                  )}

                  {!editMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
                          <h4 className="text-lg font-bold text-gray-200 mb-4">Informations personnelles</h4>
                          <div className="space-y-3">
                            <div>
                              <span className="text-gray-400">Email :</span>
                              <span className="text-white ml-2 font-medium">{user.email}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Pseudo :</span>
                              <span className="text-white ml-2 font-medium">{user.display_name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
                        <h4 className="text-lg font-bold text-gray-200 mb-4">Avatar actuel</h4>
                        <div className="flex justify-center">
                          <img
                            src={user.avatar || "/avatars/avatar1.png"}
                            alt="Avatar actuel"
                            className="w-32 h-32 rounded-full border-4 border-purple-500/50 object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
                              placeholder="votre@email.com"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Pseudo</label>
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
                              placeholder="Votre pseudo"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Nouveau mot de passe</label>
                            <input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-4">Choisir un avatar</label>
                          <div className="grid grid-cols-5 gap-3">
                            {avatars.map((avatarUrl) => (
                              <button
                                key={avatarUrl}
                                type="button"
                                onClick={() => setAvatar(avatarUrl)}
                                className={`relative rounded-full overflow-hidden transition-all duration-300 ${
                                  avatar === avatarUrl 
                                    ? "ring-4 ring-purple-500 scale-110" 
                                    : "hover:scale-105 opacity-70 hover:opacity-100"
                                }`}
                              >
                                <img
                                  src={avatarUrl}
                                  alt="Avatar"
                                  className="w-16 h-16 object-cover"
                                />
                              </button>
                            ))}
                          </div>
                          
                          <div className="mt-6 flex justify-center">
                            <div className="text-center">
                              <p className="text-gray-400 text-sm mb-2">Aperçu</p>
                              <img
                                src={avatar}
                                alt="Aperçu avatar"
                                className="w-24 h-24 rounded-full border-4 border-purple-500/50 object-cover mx-auto"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 justify-center">
                        <button
                          type="submit"
                          className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                          💾 Sauvegarder
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditMode(false)}
                          className="px-8 py-3 bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-500 hover:to-slate-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                          ❌ Annuler
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
