import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function Connection() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { setToken } = useUser();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const form = e.currentTarget;
    const email = (form.querySelector<HTMLInputElement>("#email")?.value || "").trim();
    const password = (form.querySelector<HTMLInputElement>("#password")?.value || "").trim();

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

      const response = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      //console.log("la var en question " + data.enable2fa);
      console.log("Response /login:", { status: response.status, data });
      if (response.ok) {
        if (data.require2fa){
          localStorage.setItem("for2FaUserId", data.userId.toString());
          navigate("/auth");
        }
        else{
          console.log("BAAAAAAAAAAAAAAAAAAAAAA");
          localStorage.setItem("token", data.token);
          navigate("/Dashboard");
        }
      } 
      else {
        alert("Identifiants invalides");
      }
    } catch {
      setErrors({ general: "Erreur réseau. Veuillez réessayer." });
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold mb-4">Connexion</h2>
        {errors.general && <p className="text-red-500 mb-2">{errors.general}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" required className="w-full border p-2 rounded" />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Mot de passe</label>
            <input id="password" name="password" type="password" required className="w-full border p-2 rounded" />
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded">Se connecter</button>
        </form>
      </div>
    </div>
  );
}
