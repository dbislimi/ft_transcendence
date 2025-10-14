import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../Components/SpaceBackground";
import { useAuth } from "../contexts/AuthContext";

interface UserInfos {
  name: string;
  email: string;
  password: string;
}

export default function Registration() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const name = form.querySelector<HTMLInputElement>("#Name")?.value || "";
    const email = form.querySelector<HTMLInputElement>("#email")?.value || "";
    const password = form.querySelector<HTMLInputElement>("#password")?.value || "";
    const confirmPassword = form.querySelector<HTMLInputElement>("#confirmPassword")?.value || "";

    let formErrors: Record<string, string> = {};

    if (password !== confirmPassword) {
      formErrors.password = "Les mots de passe ne correspondent pas";
      formErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{5,}$/;
    if (!passwordRegex.test(password)) {
      formErrors.password =
        "Le mot de passe doit contenir :\n- 1 majuscule\n- 1 minuscule\n- 1 chiffre\n- 1 caractère spécial\n- 5 caractères minimum";
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      formErrors.email = "Email invalide. Assurez-vous que l'email soit au format valide.";
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    const info: UserInfos = { name, email, password };

    try {
      const response = await fetch("http://localhost:3000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(info),
      });

      if (response.ok) {
        const userData = {
          id: "1",
          name: name,
          email: email
        };
        
        login(userData);
        navigate("/");
      } else {
        alert("Erreur serveur");
      }
    } catch (error) {
      const userData = {
        id: "1",
        name: name,
        email: email
      };
      
      login(userData);
      navigate("/");
    }
  };

  return (
    <>
      <SpaceBackground />
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md px-6">
          
          {/* Formulaire d'inscription */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-purple-400 mb-2">
                Inscription
              </h1>
              <p className="text-slate-400">
                Rejoignez l'aventure Transcendence
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nom */}
              <div>
                <label htmlFor="Name" className="block text-sm font-medium text-slate-300 mb-2">
                  Nom complet
                </label>
                <input
                  id="Name"
                  name="Name"
                  type="text"
                  autoComplete="name"
                  required
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
                  placeholder="Votre nom complet"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
                  placeholder="votre@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              {/* Mot de passe */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400 whitespace-pre-line">{errors.password}</p>
                )}
              </div>

              {/* Confirmation du mot de passe */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Bouton d'inscription */}
              <button
                type="submit"
                className="w-full py-3 px-6 bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                S'inscrire
              </button>
            </form>

            {/* Liens utiles */}
            <div className="mt-6 text-center">
              <p className="text-slate-400 text-sm">
                Déjà un compte ?{' '}
                <a href="/Connection" className="text-green-400 hover:text-green-300 transition-colors duration-200">
                  Se connecter
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
