import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Registration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatar, setAvatar] = useState("/avatars/avatar1.png");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const predefinedAvatars = [
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

  const handleNextStep = async () => {
    if (!name || !email || !displayName || !password || !confirmPassword) {
      setIsError(true);
      setMessage("Tous les champs sont obligatoires.");
      return;
    }

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    const nameRegex = /^[A-Z][a-z]+$/;
    if (!nameRegex.test(name)) {
      setIsError(true);
      setMessage("Le nom doit commencer par une majuscule suivie de lettres minuscules.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setIsError(true);
      setMessage("Adresse email invalide.");
      return;
    }

    const displayNameRegex = /^[a-zA-Z0-9-]+$/;
    if (!displayNameRegex.test(displayName)) {
      setIsError(true);
      setMessage("Le pseudo ne doit contenir que des lettres, chiffres ou tirets.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{6,}$/;
    if (!passwordRegex.test(password)) {
      setIsError(true);
      setMessage("Le mot de passe doit contenir au moins 6 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.");
      return;
    }

    const res = await fetch("http://localhost:3000/check-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, display_name: displayName }),
    });

    const data = await res.json();
    if (!res.ok || data.exists) {
      setIsError(true);
      setMessage(data.error || "Email ou pseudo déjà utilisé.");
      return;
    }

    setIsError(false);
    setMessage("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        displayName,
        password,
        avatar,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setIsError(false);
      setMessage("Inscription réussie ! Redirection...");
      setTimeout(() => navigate("/connection"), 2000);
    } else {
      setIsError(true);
      setMessage(data.error || "Erreur lors de l'inscription");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow bg-white">
      <h2 className="text-2xl font-bold mb-4 text-center">Inscription</h2>

      <div className="flex items-center justify-between mb-6">
        <div className={`flex-1 h-2 rounded-full ${step === 1 ? "bg-blue-500" : "bg-blue-300"}`} />
        <div className="mx-2 text-sm font-medium">{step}/2</div>
        <div className={`flex-1 h-2 rounded-full ${step === 2 ? "bg-blue-500" : "bg-blue-300"}`} />
      </div>

      {message && (
        <p className={`mb-4 text-center ${isError ? "text-red-500" : "text-green-500"}`}>
          {message}
        </p>
      )}

      {step === 1 && (
        <div>
          <h3 className="text-lg font-semibold text-center mb-4">Tes informations</h3>
          <input
            type="text"
            className="w-full border p-2 rounded mb-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom"
          />
          <input
            type="email"
            className="w-full border p-2 rounded mb-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            type="text"
            className="w-full border p-2 rounded mb-3"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Pseudo"
          />
          <input
            type="password"
            className="w-full border p-2 rounded mb-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
          />
          <input
            type="password"
            className="w-full border p-2 rounded mb-6"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmer le mot de passe"
          />
          <button
            onClick={handleNextStep}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
          >
            Suivant →
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold text-center mb-4">Choisis ton avatar</h3>
          <div className="flex justify-center mb-4">
            <img
              src={avatar}
              alt="Avatar sélectionné"
              className="w-28 h-28 rounded-full object-cover border"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {predefinedAvatars.map((a) => (
              <img
                key={a}
                src={a}
                alt="Avatar"
                className={`w-24 h-24 rounded-full object-cover border-4 cursor-pointer mx-auto ${
                  avatar === a ? "border-blue-500" : "border-gray-300"
                }`}
                onClick={() => setAvatar(a)}
              />
            ))}
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
            >
              ← Retour
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              S'inscrire
            </button>
          </div>
        </form>
      )}

      <button
        onClick={() => navigate("/connection")}
        className="w-full mt-6 bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition"
      >
        Déjà inscrit ? Se connecter
      </button>
    </div>
  );
}
