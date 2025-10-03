import React from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function Dashboard() {
  const { user, setToken, token } = useUser();
  const navigate = useNavigate();
  const defaultAvatar = "/avatars/avatar1.png";

  const handleLogout = async () => {
    if (token) {
      await fetch("http://localhost:3000/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    setToken(null);
    navigate("/");
  };

  return (
    <div className="flex max-w-6xl mx-auto mt-10 gap-6">
      <div className="flex-1 p-6 border rounded-lg shadow bg-white text-center">
        <h2 className="text-3xl font-bold mb-6">
          Bienvenue {user?.display_name || "Invité"} 🎉
        </h2>
        <img
          src={user?.avatar || defaultAvatar}
          alt="Avatar"
          className="w-32 h-32 mx-auto rounded-full border mb-4"
        />
        <p className="text-lg mb-1">Nom: {user?.name}</p>
        <p className="text-lg mb-1">Pseudo: {user?.display_name}</p>
        <p className="text-lg mb-4">Email: {user?.email}</p>
        <div className="space-y-3 max-w-sm mx-auto">
          <button
            onClick={() => navigate("/profile")}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Modifier mon profil
          </button>
          <button
            onClick={() => navigate("/friends")}
            className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Voir mes amis
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
