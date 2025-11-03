import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SpaceBackground from "../Components/SpaceBackground";

interface Friend {
  id: number;
  display_name: string;
  avatar: string;
  online: boolean;
}

interface Stats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  rank: string;
  points: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("/avatars/avatar1.png");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // États pour les vraies données
  const [stats, setStats] = useState<Stats>({
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0,
    rank: "Novice",
    points: 0
  });

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const avatars = [
    "/avatars/avatar1.png", "/avatars/avatar2.png", "/avatars/avatar3.png",
    "/avatars/avatar4.png", "/avatars/avatar5.png", "/avatars/avatar6.png",
    "/avatars/avatar7.png", "/avatars/avatar8.png", "/avatars/avatar9.png",
    "/avatars/avatar10.png"
  ];

  // Fonction pour calculer le rang basé sur les victoires
  const calculateRank = (wins: number): string => {
    if (wins >= 100) return "Légende";
    if (wins >= 50) return "Maître";
    if (wins >= 25) return "Expert";
    if (wins >= 10) return "Avancé";
    if (wins >= 5) return "Intermédiaire";
    return "Novice";
  };

  // Récupérer les vraies données
  const fetchData = async () => {
    if (!token || !user) return;
    
    setLoading(true);
    try {
      // Récupérer les amis
      const friendsResponse = await fetch("http://localhost:3001/friends", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json();
        setFriends(friendsData.map((friend: any) => ({
          ...friend,
          status: friend.online ? "En ligne" : "Hors ligne"
        })));
      }

      // Utiliser les stats de la base de données utilisateur (wins/losses)
      // Les statistiques sont déjà disponibles dans user.wins et user.losses depuis la DB
      if (user) {
        const totalGames = (user.wins || 0) + (user.losses || 0);
        const wins = user.wins || 0;
        const losses = user.losses || 0;
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
        
        const rank = calculateRank(wins);
        const points = wins * 10 + Math.floor(winRate / 10) * 5;
        
        setStats({
          totalGames,
          wins,
          losses,
          winRate,
          currentStreak: 0, // À implémenter si nécessaire
          bestStreak: 0,    // À implémenter si nécessaire
          rank,
          points
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setDisplayName(user.display_name || user.name || "");
      setAvatar(user.avatar || "/avatars/avatar1.png");
      fetchData();
    }
    
    // Animation d'entrée
    setTimeout(() => setIsLoaded(true), 100);
  }, [user, token]);

  // Sauvegarder les modifications
  const handleSave = async () => {
    if (!token) return;
    
    try {
      const response = await fetch("http://localhost:3001/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name,
          email: email,
          display_name: displayName,
          avatar: avatar,
          ...(password && { password: password })
        })
      });

      if (response.ok) {
        setMessage("Profil mis à jour avec succès !");
        setIsError(false);
        setEditMode(false);
        // Rafraîchir les données utilisateur
        window.location.reload();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || "Erreur lors de la mise à jour");
        setIsError(true);
      }
    } catch (error) {
      setMessage("Erreur de connexion");
      setIsError(true);
    }
  };

  if (!user) {
    return (
      <>
        <SpaceBackground />
        <div className="relative min-h-screen overflow-hidden">
          <div className="relative z-10 min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">Accès non autorisé</h1>
              <p className="text-gray-300 mb-6">Vous devez être connecté pour accéder à votre profil.</p>
              <button
                onClick={() => navigate("/Connection")}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
              >
                Se connecter
              </button>
            </div>
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
                  <h1 className="text-4xl font-bold text-white mb-2">
                    {user.display_name || user.name}
                  </h1>
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                    <span className="px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full text-yellow-300 text-sm font-semibold">
                      {stats.rank}
                    </span>
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-full text-blue-300 text-sm">
                      {stats.points} pts
                    </span>
                  </div>
                  <p className="text-gray-300 text-lg">
                    Membre depuis {new Date(user.created_at || Date.now()).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg text-purple-300 hover:from-purple-600/30 hover:to-blue-600/30 transition-all duration-300"
                  >
                    {editMode ? "Annuler" : "Modifier"}
                  </button>
                </div>
              </div>
            </div>

            {/* Message de feedback */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg border ${
                isError 
                  ? "bg-red-500/10 border-red-500/30 text-red-300" 
                  : "bg-green-500/10 border-green-500/30 text-green-300"
              }`}>
                {message}
              </div>
            )}

            {/* Onglets */}
            <div className="flex gap-2 mb-8">
              {["overview", "stats", "friends", "settings"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    activeTab === tab
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                      : "bg-slate-800/50 text-gray-300 hover:bg-slate-700/50"
                  }`}
                >
                  {tab === "overview" && "Vue d'ensemble"}
                  {tab === "stats" && "Statistiques"}
                  {tab === "friends" && "Amis"}
                  {tab === "settings" && "Paramètres"}
                </button>
              ))}
            </div>

            {/* Contenu des onglets */}
            <div className="bg-gradient-to-r from-slate-800/80 via-purple-900/80 to-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/20 p-8 shadow-2xl">
              
              {/* Vue d'ensemble */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-blue-300 mb-4">🎮 Parties jouées</h3>
                    <p className="text-3xl font-bold text-white">{stats.totalGames}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-green-300 mb-4">🏆 Victoires</h3>
                    <p className="text-3xl font-bold text-white">{stats.wins}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-purple-300 mb-4">📈 Taux de victoire</h3>
                    <p className="text-3xl font-bold text-white">{stats.winRate}%</p>
                  </div>
                </div>
              )}

              {/* Statistiques */}
              {activeTab === "stats" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white mb-6">Statistiques détaillées</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-600/30">
                      <h3 className="text-lg font-semibold text-white mb-4">Performance générale</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Parties totales</span>
                          <span className="text-white font-semibold">{stats.totalGames}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Victoires</span>
                          <span className="text-green-400 font-semibold">{stats.wins}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Défaites</span>
                          <span className="text-red-400 font-semibold">{stats.losses}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Taux de victoire</span>
                          <span className="text-purple-400 font-semibold">{stats.winRate}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-600/30">
                      <h3 className="text-lg font-semibold text-white mb-4">Rang et points</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Rang actuel</span>
                          <span className="text-yellow-400 font-semibold">{stats.rank}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Points totaux</span>
                          <span className="text-blue-400 font-semibold">{stats.points}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Amis */}
              {activeTab === "friends" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white mb-6">Mes amis</h2>
                  
                  {loading ? (
                    <div className="text-center text-gray-300">Chargement des amis...</div>
                  ) : friends.length === 0 ? (
                    <div className="text-center text-gray-300">
                      <p className="text-lg mb-4">Vous n'avez pas encore d'amis</p>
                      <p className="text-sm">Ajoutez des amis pour voir leurs profils ici !</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {friends.map((friend) => (
                        <div key={friend.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-600/30 hover:border-purple-500/30 transition-all duration-300">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={friend.avatar || "/avatars/avatar1.png"}
                                alt={friend.display_name}
                                className="w-12 h-12 rounded-full border border-slate-600"
                              />
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-800 ${
                                friend.online ? "bg-green-500" : "bg-gray-500"
                              }`}></div>
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">{friend.display_name}</h3>
                              <p className="text-sm text-gray-400">
                                {friend.online ? "En ligne" : "Hors ligne"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Paramètres */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white mb-6">Paramètres du profil</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Nom d'utilisateur
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={!editMode}
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={!editMode}
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Nom d'affichage
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          disabled={!editMode}
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Nouveau mot de passe (optionnel)
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={!editMode}
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Avatar
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {avatars.map((avatarPath) => (
                            <button
                              key={avatarPath}
                              onClick={() => setAvatar(avatarPath)}
                              disabled={!editMode}
                              className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                                avatar === avatarPath
                                  ? "border-purple-500 bg-purple-500/20"
                                  : "border-slate-600 hover:border-slate-500"
                              } ${!editMode ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <img
                                src={avatarPath}
                                alt="Avatar"
                                className="w-8 h-8 rounded-full"
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {editMode && (
                        <button
                          onClick={handleSave}
                          className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 font-semibold"
                        >
                          Sauvegarder les modifications
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
