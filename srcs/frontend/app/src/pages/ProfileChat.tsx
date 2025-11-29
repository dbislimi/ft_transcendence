import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../context/UserContext";
import SpaceBackground from "../Components/SpaceBackground";
import { API_BASE_URL } from "../config/api";


interface PublicUser {
  id: number;
  display_name: string;
  avatar?: string;
  online?: number | boolean;
  created_at?: string;
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

export default function PublicProfile() {
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>(); 
  const { user } = useUser();
  
  const [activeTab, setActiveTab] = useState<"overview" | "stats" | "history">("overview");
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [targetUser, setTargetUser] = useState<PublicUser | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalGames: 0, wins: 0, losses: 0, winRate: 0, botWins: 0, playerWins: 0, tournamentsWon: 0
  });
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);


  useEffect(() => {
    if (name && user) {
      const decodedName = decodeURIComponent(name);
      loadProfileData(decodedName);
    }
  }, [name, user]);

  const loadProfileData = async (userName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await fetchUserByName(userName);
      
      if (user && user.id) {
        setTargetUser(user);
        
        await Promise.all([
          fetchUserStats(user.id),
          fetchMatchHistory(user.id, 1)
        ]);
        
        setTimeout(() => setIsLoaded(true), 100);
      } else {
        setError(t('errors.userNotFound'));
      }
    } catch (err) {
      console.error("Erreur chargement profil:", err);
      setError("Erreur lors du chargement du profil.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserByName = async (userName: string) => {
    const res = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userName)}`, { 
      headers: { Authorization: `Bearer ${user}` } 
    });
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(t('errors.network'));
    }
    return await res.json();
  };

  const fetchUserStats = async (userId: number) => {
    const res = await fetch(`${API_BASE_URL}/api/user-stats/${userId}`, { 
      headers: { Authorization: `Bearer ${user}` } 
    });
    if (res.ok) setStats(await res.json());
  };

  const fetchMatchHistory = async (userId: number, page: number) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/match-history/${userId}?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${user}` }
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
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadMoreHistory = () => {
    if (!historyLoading && hasMoreHistory && targetUser) {
      const nextPage = historyPage + 1;
      setHistoryPage(nextPage);
      fetchMatchHistory(targetUser.id, nextPage);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <>
        <SpaceBackground />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-300 font-medium text-lg">Recherche des données de vol...</p>
          </div>
        </div>
      </>
    );
  }

  // --- Render : Error (User Not Found) ---

  if (error || !targetUser) {
    return (
      <>
        <SpaceBackground />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-slate-800/90 p-10 rounded-3xl border border-red-500/30 backdrop-blur-xl shadow-2xl max-w-md mx-4">
            <div className="text-6xl mb-6">🛰️</div>
            <h2 className="text-3xl font-bold text-red-400 mb-4">Signal Perdu</h2>
            <p className="text-gray-400 mb-8 text-lg">Le joueur <span className="text-white font-bold">{decodeURIComponent(name || "")}</span> est introuvable dans ce secteur de la galaxie.</p>
            <button 
              onClick={() => navigate(-1)}
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              Retour à la base
            </button>
          </div>
        </div>
      </>
    );
  }

  // --- Render : Main Profile ---

  return (
    <>
      <SpaceBackground />
      <div className={`relative min-h-screen overflow-hidden transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* HEADER PROFIL */}
          <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 mb-8 shadow-2xl relative overflow-hidden">
            {/* Effet de fond décoratif */}
            <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              
              {/* Avatar */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full opacity-75 group-hover:opacity-100 blur transition duration-500"></div>
                <img
                  src={targetUser.avatar || "/avatars/avatar1.png"}
                  alt={targetUser.display_name}
                  className="relative w-36 h-36 rounded-full border-4 border-slate-900 object-cover shadow-2xl"
                />
                {/* Indicateur en ligne (optionnel si tu as l'info) */}
                {targetUser.online === 1 && (
                   <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-slate-800 rounded-full" title={t('common.online')}></div>
                )}
              </div>
              
              {/* Infos Texte */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
                  {targetUser.display_name}
                </h1>
                
                {/* Badges / Petites stats header */}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start mt-4">
                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <div>
                        <div className="text-xs text-gray-400 uppercase font-bold">Tournois</div>
                        <div className="text-white font-bold">{stats.tournamentsWon}</div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 flex items-center gap-2">
                    <span className="text-2xl">⚔️</span>
                    <div>
                        <div className="text-xs text-gray-400 uppercase font-bold">Matchs</div>
                        <div className="text-white font-bold">{stats.totalGames}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bouton Retour */}
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all duration-200 flex items-center gap-2 hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                Retour
              </button>
            </div>
          </div>

          {/* ONGLETS DE NAVIGATION */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-1 border border-slate-700 inline-flex shadow-lg">
              {(["overview", "stats", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === tab
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab === "overview" && "Vue d'ensemble"}
                  {tab === "stats" && "Statistiques"}
                  {tab === "history" && "Historique"}
                </button>
              ))}
            </div>
          </div>

          {/* CONTENU DES ONGLETS */}
          <div className="min-h-[400px]">
            
            {/* --- VUE D'ENSEMBLE --- */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
                <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/40 border border-blue-500/20 rounded-2xl p-6 text-center shadow-xl">
                  <div className="text-blue-400 mb-2 font-medium uppercase tracking-wider text-sm">Parties Totales</div>
                  <div className="text-5xl font-black text-white">{stats.totalGames}</div>
                </div>
                <div className="bg-gradient-to-br from-green-900/40 to-slate-900/40 border border-green-500/20 rounded-2xl p-6 text-center shadow-xl">
                  <div className="text-green-400 mb-2 font-medium uppercase tracking-wider text-sm">Victoires</div>
                  <div className="text-5xl font-black text-white">{stats.wins}</div>
                </div>
                <div className="bg-gradient-to-br from-red-900/40 to-slate-900/40 border border-red-500/20 rounded-2xl p-6 text-center shadow-xl">
                  <div className="text-red-400 mb-2 font-medium uppercase tracking-wider text-sm">Défaites</div>
                  <div className="text-5xl font-black text-white">{stats.losses}</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-900/40 to-slate-900/40 border border-yellow-500/20 rounded-2xl p-6 text-center shadow-xl">
                  <div className="text-yellow-400 mb-2 font-medium uppercase tracking-wider text-sm">Taux de Victoire</div>
                  <div className="text-5xl font-black text-white">{stats.winRate}%</div>
                </div>
              </div>
            )}

            {/* --- STATISTIQUES DÉTAILLÉES --- */}
            {activeTab === 'stats' && (
              <div className="bg-slate-800/60 backdrop-blur-md rounded-3xl border border-slate-700/50 p-8 shadow-xl animate-fadeIn">
                <h3 className="text-2xl font-bold text-white mb-8 border-b border-slate-700 pb-4">
                  Détails de Performance
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* VS BOTS */}
                  <div className="bg-slate-700/30 rounded-2xl p-6 border border-slate-600 text-center hover:bg-slate-700/50 transition">
                    <div className="text-4xl mb-4">🤖</div>
                    <div className="text-gray-400 text-sm uppercase font-bold mb-1">Contre Robots</div>
                    <div className="text-3xl font-bold text-white">{stats.botWins} <span className="text-sm text-gray-500 font-normal">victoires</span></div>
                  </div>

                  {/* VS HUMAINS */}
                  <div className="bg-slate-700/30 rounded-2xl p-6 border border-slate-600 text-center hover:bg-slate-700/50 transition">
                    <div className="text-4xl mb-4">👤</div>
                    <div className="text-gray-400 text-sm uppercase font-bold mb-1">Contre Joueurs</div>
                    <div className="text-3xl font-bold text-white">{stats.playerWins} <span className="text-sm text-gray-500 font-normal">victoires</span></div>
                  </div>

                  {/* TOURNOIS */}
                  <div className="bg-slate-700/30 rounded-2xl p-6 border border-slate-600 text-center hover:bg-slate-700/50 transition">
                    <div className="text-4xl mb-4">🏆</div>
                    <div className="text-gray-400 text-sm uppercase font-bold mb-1">Tournois</div>
                    <div className="text-3xl font-bold text-white">{stats.tournamentsWon} <span className="text-sm text-gray-500 font-normal">remportés</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* --- HISTORIQUE --- */}
            {activeTab === 'history' && (
              <div className="bg-slate-800/60 backdrop-blur-md rounded-3xl border border-slate-700/50 p-6 md:p-8 shadow-xl animate-fadeIn">
                <h3 className="text-2xl font-bold text-white mb-6">
                  Historique des Matchs
                </h3>

                <div className="space-y-4">
                  {matchHistory.length > 0 ? (
                    <>
                      {matchHistory.map((match) => (
                        <div key={match.id} className={`group relative p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] overflow-hidden ${
                          match.isWinner 
                            ? "bg-green-900/10 border-green-500/20 hover:bg-green-900/20"
                            : "bg-red-900/10 border-red-500/20 hover:bg-red-900/20"
                        }`}>
                          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
                            
                            {/* Partie Gauche : Adversaire */}
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                {match.opponent.isBot ? (
                                  <div className="w-12 h-12 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center text-xl">
                                    🤖
                                  </div>
                                ) : (
                                  <img 
                                    src={match.opponent.avatar || "/avatars/avatar1.png"} 
                                    alt={match.opponent.name}
                                    className="w-12 h-12 rounded-full border border-slate-500 object-cover"
                                  />
                                )}
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`font-black text-lg ${match.isWinner ? "text-green-400" : "text-red-400"}`}>
                                    {match.isWinner ? "WIN" : "LOSS"}
                                  </span>
                                  <span className="text-gray-400 text-sm">vs</span>
                                  <span className="text-white font-bold text-lg">{match.opponent.name}</span>
                                </div>
                                <div className="text-gray-500 text-sm flex items-center gap-2">
                                  <span>{formatDate(match.date)}</span>
                                  <span>•</span>
                                  <span className="capitalize">{match.matchType || "Standard"}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Partie Droite : Score */}
                            <div className="text-right pl-4 border-l border-white/5">
                                {match.scores && (
                                  <div className="text-2xl font-mono font-bold text-white tracking-widest">
                                    {match.scores[0]} - {match.scores[1]}
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Bouton Charger Plus */}
                      {hasMoreHistory && (
                        <div className="flex justify-center mt-8">
                          <button
                            onClick={loadMoreHistory}
                            disabled={historyLoading}
                            className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {historyLoading ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white/50 border-t-white rounded-full"></div>
                                Chargement...
                              </>
                            ) : (
                              "Voir plus de matchs"
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-dashed border-slate-700">
                      <div className="text-5xl mb-4 grayscale opacity-50">📜</div>
                      <h4 className="text-xl font-bold text-gray-400 mb-2">Historique Vierge</h4>
                      <p className="text-gray-500">Aucun match enregistré pour ce pilote.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </>
  );
}