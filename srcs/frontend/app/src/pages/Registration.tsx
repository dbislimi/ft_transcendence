import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../Components/SpaceBackground";
import { useAuth } from "../contexts/AuthContext";

interface UserInfos {
  name: string;
  email: string;
  password: string;
  displayName?: string;
  avatar?: string;
}

export default function Registration() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [avatar, setAvatar] = useState("/avatars/avatar1.png");
  
  const [formData, setFormData] = useState<UserInfos>({
    name: "",
    email: "",
    password: "",
    displayName: "",
    avatar: "/avatars/avatar1.png"
  });

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
    const nameInput = (document.getElementById("Name") as HTMLInputElement)?.value || "";
    const emailInput = (document.getElementById("email") as HTMLInputElement)?.value || "";
    const displayNameInput = (document.getElementById("displayName") as HTMLInputElement)?.value || "";
    const passwordInput = (document.getElementById("password") as HTMLInputElement)?.value || "";
    const confirmPasswordInput = (document.getElementById("confirmPassword") as HTMLInputElement)?.value || "";

    let formErrors: Record<string, string> = {};
    if (passwordInput !== confirmPasswordInput) {
      setErrors({ password: "Les mots de passe ne correspondent pas", confirmPassword: "Les mots de passe ne correspondent pas" });
      return;
    }

    const passwordRegexUpdated = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
    if (!passwordRegexUpdated.test(passwordInput)) {
      setErrors({ password: "Le mot de passe doit contenir : 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial, 6 caractères minimum" });
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailInput)) {
      setErrors({ email: "Email invalide. Assurez-vous que l'email soit au format valide." });
      return;
    }

    setFormData({
      name: nameInput,
      email: emailInput,
      password: passwordInput,
      displayName: displayNameInput || nameInput.replace(/\s+/g, '').toLowerCase(),
      avatar: avatar
    });

    setErrors({});
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const info: UserInfos = {
      ...formData,
      avatar: avatar
    };

    try {
      console.debug("[Registration] Sending payload to /register:", info);

      const response = await fetch("http://localhost:3001/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(info),
      });

      const text = await response.text().catch(() => "");
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }

      console.debug("[Registration] /register response status:", response.status, "body:", data);

      if (response.ok) {
        const userData = {
          id: String(data.user?.id || "1"),
          name: data.user?.name || info.name,
          email: data.user?.email || info.email,
        };
        login(userData);
        navigate("/");
      } else {
        const errMsg = data.error || (data.raw ? data.raw : "Erreur serveur");
        console.warn("[Registration] register failed:", response.status, errMsg);
        alert(errMsg);
      }
    } catch (error) {
      console.error("[Registration] Exception when calling /register:", error);
      const userData = {
        id: "1",
        name: info.name,
        email: info.email,
      };
      login(userData);
      navigate("/");
    }
  };

  return (
    <>
      <SpaceBackground />
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-lg px-6">
          
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-purple-400 mb-2">
                Inscription
              </h1>
              <p className="text-slate-400">
                Rejoignez l'aventure Transcendence
              </p>
            </div>

            <div className="flex items-center justify-between mb-8">
              <div className="flex-1 relative">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r from-green-400 to-purple-400 transition-all duration-500 ${
                      step === 1 ? "w-1/2" : "w-full"
                    }`}
                  />
                </div>
              </div>
              <div className="mx-4 text-sm font-medium text-slate-300 bg-slate-700/50 px-3 py-1 rounded-full">
                {step}/2
              </div>
            </div>

            {errors && Object.keys(errors).length > 0 && (
              <div className={`mb-6 p-4 rounded-lg border ${
                errors ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-green-500/10 border-green-500/30 text-green-400"
              }`}>
                <p className="text-center text-sm">{Object.values(errors)[0]}</p>
              </div>
            )}

            {step === 1 && (
              <div>
                <h3 className="text-xl font-semibold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-purple-300">
                  Vos informations
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="Name" className="block text-sm font-medium text-slate-300 mb-2">Nom complet</label>
                    <input id="Name" name="Name" type="text" autoComplete="name" required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200" placeholder="Votre nom complet" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                    <input id="email" name="email" type="email" autoComplete="email" required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200" placeholder="votre@email.com" />
                  </div>
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-slate-300 mb-2">Pseudo</label>
                    <input id="displayName" name="displayName" type="text" required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200" placeholder="Votre pseudo (lettres/nombres/-)" />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Mot de passe</label>
                    <input id="password" name="password" type="password" autoComplete="new-password" required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200" placeholder="••••••••" />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">Confirmer le mot de passe</label>
                    <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200" placeholder="••••••••" />
                  </div>
                </div>

                <button onClick={handleNextStep} className="w-full mt-8 py-3 px-6 bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2">
                  <span>Suivant</span>
                </button>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit}>
                <h3 className="text-xl font-semibold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-purple-300">Choisissez votre avatar</h3>

                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <img src={avatar} alt="Avatar sélectionné" className="w-32 h-32 rounded-full object-cover border-4 border-green-400/50 shadow-lg relative z-10" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400/10 to-purple-400/10 pointer-events-none z-0" />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3 mb-8">
                  {predefinedAvatars.map((a) => (
                    <div key={a} className="relative group">
                      <img src={a} alt="Avatar" className={`w-16 h-16 rounded-full object-cover border-2 cursor-pointer transition-transform duration-200 transform-gpu group-hover:scale-110 ${avatar === a ? "border-green-400 shadow-lg shadow-green-400/50 z-10 relative" : "border-slate-600 hover:border-slate-400"}`} onClick={() => setAvatar(a)} />
                        {avatar === a && (
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400/20 to-purple-400/20 pointer-events-none z-0"></div>
                        )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between space-x-4">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 px-6 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold rounded-lg transition-all duration-200 border border-slate-600 hover:border-slate-500">Retour</button>
                  <button type="submit" className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl">S'inscrire</button>
                </div>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-slate-600/30">
              <div className="text-center">
                <p className="text-slate-400 text-sm">Déjà un compte ? <a href="/Connection" className="text-green-400 hover:text-green-300 transition-colors duration-200">Se connecter</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
