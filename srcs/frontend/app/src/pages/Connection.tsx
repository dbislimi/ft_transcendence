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
          localStorage.setItem("userData", JSON.stringify(data));
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

              <a
                href={`${API_BASE_URL}/api/auth/google`}
                className="w-full py-3 px-6 bg-white hover:bg-gray-100 !text-black font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </a>
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
