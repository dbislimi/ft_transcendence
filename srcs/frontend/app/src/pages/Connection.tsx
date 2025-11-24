import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../Components/SpaceBackground";
import { useAuth } from "../contexts/AuthContext";

export default function Connection() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const email = form.querySelector<HTMLInputElement>("#email")?.value || "";
    const password = form.querySelector<HTMLInputElement>("#password")?.value || "";

    let formErrors: Record<string, string> = {};

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      formErrors.email = "Email invalide.";
    }

    if (!password) {
      formErrors.password = "Le mot de passe est requis.";
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    try {
      const response = await fetch("https://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.require2fa) {
          if (data.userId) {
            localStorage.setItem("for2FaUserId", String(data.userId));
          }
          navigate("/auth");
          return;
        }

        const userData = {
          id: Number(data.user?.id) || 1,
          name: data.user?.name || email.split("@")[0],
          email: email,
        };

        login(userData, data.token);
        navigate("/");
      } else {
        alert("Identifiants invalides");
      }
    } catch (error) {
      const userData = {
        id: 1,
        name: email.split('@')[0],
        email: email
      };
      
      // @ts-ignore
      login(userData);
      navigate("/");
    }
  };

  return (
    <>
      <SpaceBackground />
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md px-6">
          
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                Connexion
              </h1>
              <p className="text-slate-400">
                Accédez à votre compte Transcendence
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                  placeholder="votre@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Se connecter
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-slate-400 text-sm">
                Pas encore de compte ?{' '}
                <a href="/Registration" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
                  S'inscrire
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
