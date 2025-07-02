import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [username, setUsername] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("TokenJwt");

    if (!token) {
      navigate("/login");
      return;
    }

    // Vérifie le token avec la route /profile
    fetch("http://localhost:3000/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        // data.message = "Bonjour {nom}"
        const match = data.message.match(/Bonjour (.+)/);
        setUsername(match ? match[1] : "Utilisateur");
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">
          Bienvenue{username ? `, ${username}` : ""} !
        </h1>
        <p className="text-gray-700 mb-6">Ceci est votre tableau de bord sécurisé.</p>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
