import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Match {
  id: number;
  opponent: string;
  result: "win" | "lose" | "draw";
  date: string;
}

interface LeaderboardEntry {
  name: string;
  score: number;
}

export default function Dashboard() {
  const [username, setUsername] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("http://localhost:3000/profile", { headers }),
      fetch("http://localhost:3000/my-matches", { headers }),
      fetch("http://localhost:3000/leaderboard", { headers }),
    ])
      .then(async ([profileRes, matchesRes, leaderboardRes]) => {
        if (!profileRes.ok) throw new Error("Unauthorized");
        const profileData = await profileRes.json();
        const nameMatch = profileData.message.match(/Bonjour (.+)/);
        setUsername(nameMatch ? nameMatch[1] : "Utilisateur");

        if (matchesRes.ok) setMatches(await matchesRes.json());
        if (leaderboardRes.ok) setLeaderboard(await leaderboardRes.json());
      })
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const email = e.currentTarget.inviteEmail.value;

    fetch("http://localhost:3000/invite", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        alert("✅ Invitation envoyée !");
        e.currentTarget.reset();
      })
      .catch(() => alert("❌ Erreur lors de l’envoi de l’invitation"));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-2xl text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Bienvenue{username ? `, ${username}` : ""} !
        </h1>
        <p className="text-gray-700 mb-4">Voici ton tableau de bord personnel.</p>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
        >
          Se déconnecter
        </button>
      </div>

      {/*  Mes parties */}
      <div className="bg-white rounded shadow-md w-full max-w-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🕹️ Mes parties</h2>
        {matches.length === 0 ? (
          <p className="text-gray-600">Aucune partie jouée.</p>
        ) : (
          <ul className="divide-y">
            {matches.map((match) => (
              <li key={match.id} className="py-2 flex justify-between">
                <span>{match.date} vs {match.opponent}</span>
                <span>
                  {match.result === "win" ? "✅ Victoire" : match.result === "lose" ? "❌ Défaite" : "🟰 Égalité"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 🏆 Classement général */}
      <div className="bg-white rounded shadow-md w-full max-w-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🏆 Classement général</h2>
        {leaderboard.length === 0 ? (
          <p className="text-gray-600">Aucun joueur classé.</p>
        ) : (
          <ol className="list-decimal ml-6 space-y-1">
            {leaderboard.map((entry, i) => (
              <li key={i} className="flex justify-between">
                <span>{entry.name}</span>
                <span>{entry.score} pts</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* 🤝 Inviter un ami */}
      <div className="bg-white rounded shadow-md w-full max-w-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">🤝 Inviter un ami</h2>
        <form className="space-y-4" onSubmit={handleInvite}>
          <input
            name="inviteEmail"
            type="email"
            required
            placeholder="Email de ton ami"
            className="border p-2 w-full rounded"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 rounded w-full hover:bg-blue-700 transition"
          >
            Envoyer l'invitation
          </button>
        </form>
      </div>
    </div>
  );
}
