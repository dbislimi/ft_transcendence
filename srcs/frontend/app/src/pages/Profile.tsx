import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();
  const [id, setId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("/avatars/avatar1.png");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const avatars = [
    "/avatars/avatar1.png",
    "/avatars/avatar2.png",
    "/avatars/avatar3.png",
    "/avatars/avatar4.png",
    "/avatars/avatar5.png",
    "/avatars/avatar6.png",
    "/avatars/avatar7.png",
    "/avatars/avatar8.png",
    "/avatars/avatar9.png",
    "/avatars/avatar10.png",
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const res = await fetch("http://localhost:3000/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setId(data.id || null);
        setName(data.name || "");
        setEmail(data.email || "");
        setDisplayName(data.display_name || "");
        setAvatar(
          data.avatar && data.avatar.trim() !== ""
            ? data.avatar
            : "/avatars/avatar1.png"
        );
      } else {
        navigate("/login");
      }
    };
    fetchProfile();
  }, [navigate]);

  const validateName = (name: string) => /^[A-Z][a-z]+$/.test(name);
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateDisplayName = (pseudo: string) =>
    /^[a-zA-Z0-9-]+$/.test(pseudo);
  const validatePassword = (password: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{6,}$/.test(password);

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

    const token = sessionStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

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
      await refreshUser();
      setTimeout(() => setMessage(""), 3000);
    } else {
      setIsError(true);
      setMessage(data.error || "Erreur lors de la mise à jour");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow bg-white">
      <h2 className="text-2xl font-bold mb-4">Mon Profil</h2>
      {message && (
        <p className={`mb-4 text-center ${isError ? "text-red-500" : "text-green-500"}`}>
          {message}
        </p>
      )}
      <div className="flex justify-center mb-4">
        <img src={avatar} alt="Avatar" className="w-28 h-28 rounded-full object-cover border" />
      </div>
      <div className="flex justify-center gap-4 mb-4 flex-wrap">
        {avatars.map((a) => (
          <img
            key={a}
            src={a}
            alt="Avatar"
            className={`w-20 h-20 rounded-full object-cover border-2 cursor-pointer ${avatar === a ? "border-blue-500" : "border-gray-300"}`}
            onClick={() => setAvatar(a)}
          />
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" className="w-full border p-2 rounded" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" />
        <input type="email" className="w-full border p-2 rounded" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="text" className="w-full border p-2 rounded" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Pseudo" />
        <input type="password" className="w-full border p-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe" />
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition">
          Mettre à jour
        </button>
      </form>
      <button
        onClick={() => navigate("/dashboard")}
        className="w-full mt-4 bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition"
      >
        Retour
      </button>
    </div>
  );
}
