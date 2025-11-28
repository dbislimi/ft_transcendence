import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../Components/SpaceBackground";
import { useUser } from "../context/UserContext";
import { API_BASE_URL } from "../config/api";

export default function Connection() {
  const { t } = useTranslation();
  const { login, setToken } = useUser();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const form = e.currentTarget;
    const email = (form.querySelector<HTMLInputElement>("#email")?.value || "").trim();
    const password = (form.querySelector<HTMLInputElement>("#password")?.value || "").trim();

    let formErrors: Record<string, string> = {};

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      formErrors.email = t('connection.errors.invalidEmail');
    }

    if (!password) {
      formErrors.password = t('connection.errors.passwordRequired');
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Response /login:", { status: response.status, data });
      if (response.ok) {
        if (data.require2fa){
          localStorage.setItem("for2FaUserId", data.userId.toString());
          navigate("/auth");
        }
        else{
          // Utiliser setToken au lieu de localStorage directement
          setToken(data.token);
          navigate("/");
        }
      } 
      else {
        alert(t('connection.errors.invalidCredentials'));
      }
    } catch {
      setErrors({ general: t('connection.errors.networkError') });
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
                {t('connection.title')}
              </h1>
              <p className="text-slate-400">
                {t('connection.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('connection.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                  placeholder={t('connection.emailPlaceholder')}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('connection.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                  placeholder={t('connection.passwordPlaceholder')}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {t('connection.submit')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-slate-400 text-sm">
                {t('connection.noAccount')}{' '}
                <a href="/Registration" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
                  {t('connection.signUp')}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
