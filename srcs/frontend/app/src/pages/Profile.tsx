import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
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
  const { user, refreshUser, token } = useUser();
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
      const friendsResponse = await fetch("http://localhost:3000/friends", {
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
          currentStreak: 0, // Pas de calcul de séries sans historique des matchs
          bestStreak: 0,   // Pas de calcul de séries sans historique des matchs
          rank,
          points
        });
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setDisplayName(user.display_name || "");
      setAvatar(user.avatar || "/avatars/avatar1.png");
      fetchData();
    }
    setIsLoaded(true);
  }, [user, token]);

  const validateName = (name: string) => /^[A-Z][a-z]+$/.test(name);
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateDisplayName = (pseudo: string) => /^[a-zA-Z0-9-]+$/.test(pseudo);
  const validatePassword = (password: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{6,}$/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = {};

    if (name && name !== user?.name) {
      if (!validateName(name)) {
        setIsError(true);
        setMessage("Le nom doit commencer par une majuscule suivie uniquement de lettres minuscules.");
        return;
      }
      body.name = name;
    }

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
                    {user.display_name || user.name}
                  </h1>
                  <p className="text-xl text-gray-400 mb-4">{user.name}</p>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <div className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border border-emerald-500/30 rounded-lg px-4 py-2">
                      <span className="text-emerald-300 font-semibold">{stats.rank}</span>
                    </div>
                    <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg px-4 py-2">
                      <span className="text-yellow-300 font-semibold">{stats.points} pts</span>
                    </div>
                    <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg px-4 py-2">
                      <span className="text-purple-300 font-semibold">{stats.winRate}% WR</span>
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
                      <div className="text-center p-4 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-lg border border-yellow-500/30">
                        <div className="text-3xl font-bold text-yellow-300">{stats.currentStreak}</div>
                        <div className="text-gray-400">Série actuelle</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">
                      👥 Amis en ligne
                    </h3>
                    <div className="space-y-3">
                      {friends.filter(f => f.online).slice(0, 4).map((friend) => (
                        <div key={friend.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600/30">
                          <div className="relative">
                            <img src={friend.avatar} alt={friend.display_name} className="w-10 h-10 rounded-full" />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800"></div>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-medium">{friend.display_name}</div>
                            <div className="text-green-400 text-sm">{friend.online ? "En ligne" : "Hors ligne"}</div>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                      { label: "Parties totales", value: stats.totalGames, color: "blue", icon: "🎮" },
                      { label: "Taux de victoire", value: `${stats.winRate}%`, color: "green", icon: "📈" },
                      { label: "Meilleure série", value: stats.bestStreak, color: "purple", icon: "🔥" },
                      { label: "Points", value: stats.points, color: "yellow", icon: "⭐" }
                    ].map((stat, index) => (
                      <div key={index} className={`text-center p-6 bg-gradient-to-r from-${stat.color}-600/20 to-${stat.color}-500/20 rounded-xl border border-${stat.color}-500/30`}>
                        <div className="text-4xl mb-2">{stat.icon}</div>
                        <div className={`text-3xl font-bold text-${stat.color}-300 mb-1`}>{stat.value}</div>
                        <div className="text-gray-400 text-sm">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
                    <h4 className="text-xl font-bold text-gray-200 mb-4">Progression du rang</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-slate-600 rounded-full h-4 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full w-3/4 rounded-full"></div>
                      </div>
                      <span className="text-purple-300 font-semibold">{stats.rank}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Liste des amis */}
              {activeTab === "friends" && (
                <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
                  <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-8">
                    👥 Liste d'amis
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {friends.map((friend) => (
                      <div key={friend.id} className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img src={friend.avatar} alt={friend.display_name} className="w-16 h-16 rounded-full border-2 border-slate-600" />
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${friend.online ? 'bg-green-500' : 'bg-gray-500'} rounded-full border-2 border-slate-800`}></div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-white">{friend.display_name}</h4>
                            <p className="text-gray-400">{friend.display_name}</p>
                            <p className={`text-sm ${friend.online ? 'text-green-400' : 'text-gray-500'}`}>
                              {friend.online ? "En ligne" : "Hors ligne"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-lg border border-blue-500/30 hover:border-blue-400/50 transition-colors">
                              💬
                            </button>
                            <button className="px-3 py-1 bg-green-600/20 text-green-300 rounded-lg border border-green-500/30 hover:border-green-400/50 transition-colors">
                              🎮
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                              <span className="text-gray-400">Nom :</span>
                              <span className="text-white ml-2 font-medium">{user.name}</span>
                            </div>
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
                            <label className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
                              placeholder="Votre nom"
                            />
                          </div>
                          
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
