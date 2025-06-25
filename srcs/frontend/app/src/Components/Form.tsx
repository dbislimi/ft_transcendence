import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface UserInfos {
  name: string;
  email: string;
  password: string;
}

interface Props {
  type: string;
}

export default function Form({ type }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let x = 10; 
    const speed = 2;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dessiner le carré bleu statique
      ctx.fillStyle = "blue";
      ctx.fillRect(10, 10, 100, 100);

      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(x, 100, 30, 0, Math.PI * 2);
      ctx.fill();

      x += speed;
      if (x > canvas.width - 30 || x < 30) {
        x = 10;
      }

      requestAnimationFrame(animate);
    };

    animate();
  }, []);

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

      if (response.ok) 
        if (response.ok) {
          alert("Inscription réussie");
          navigate("/Confirmation");
        }        
      else
       alert("Erreur serveur");
    } catch (error) {
      alert("Erreur réseau");
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Your Company"
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
          className="mx-auto h-10 w-auto"
        />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
          {type}
        </h2>
        <canvas
          ref={canvasRef}
          width={300}
          height={200}
          className="border-2 border-gray-800 mt-6 rounded-lg shadow-lg"
        ></canvas>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="Name" className="block text-sm font-medium text-gray-900">
              Name
            </label>
            <input
              id="Name"
              name="Name"
              type="text"
              placeholder="Enter your name"
              required
              className="block w-full rounded-md px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-indigo-600"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              required
              className="block w-full rounded-md px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-indigo-600"
            />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              className="block w-full rounded-md px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-indigo-600"
            />
            {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              required
              className="block w-full rounded-md px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-indigo-600"
            />
            {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white px-3 py-1.5 rounded-md">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
