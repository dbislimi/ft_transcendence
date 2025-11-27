import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SpaceBackground from "../Components/SpaceBackground";
import { API_BASE_URL } from "../config/api";

export default function Registration() {
	const navigate = useNavigate();
	const [step, setStep] = useState(1);

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
		if (!email || !displayName || !password || !confirmPassword) {
			setIsError(true);
			setMessage("Tous les champs sont obligatoires.");
			return;
		}

		if (password !== confirmPassword) {
			setIsError(true);
			setMessage("Les mots de passe ne correspondent pas.");
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
			setMessage(
				"Le pseudo ne doit contenir que des lettres, chiffres ou tirets."
			);
			return;
		}

		const passwordRegex =
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{6,}$/;
		if (!passwordRegex.test(password)) {
			setIsError(true);
			setMessage(
				"Le mot de passe doit contenir au moins 6 caracteres, une majuscule, une minuscule, un chiffre et un caractere special."
			);
			return;
		}

		const res = await fetch(`${API_BASE_URL}/check-user`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, display_name: displayName }),
		});

		const data = await res.json();
		if (!res.ok || data.exists) {
			setIsError(true);
			setMessage(data.error || "Email ou pseudo dejà utilise.");
			return;
		}

		setIsError(false);
		setMessage("");
		setStep(2);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const res = await fetch(`${API_BASE_URL}/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				displayName,
				email,
				password,
				avatar,
			}),
		});

		const data = await res.json();

		if (res.ok) {
			setIsError(false);
			setMessage("Inscription reussie ! Redirection...");
			setTimeout(() => navigate("/connection"), 2000);
		} else {
			setIsError(true);
			setMessage(data.error || "Erreur lors de l'inscription");
		}
	};

	return (
		<>
			<SpaceBackground />
			<div className="flex items-center justify-center min-h-screen">
				<div className="w-full max-w-lg px-6">
					<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
						<div className="text-center mb-8">
							<h1 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-purple-400 mb-2">
								Inscription
							</h1>
							<p className="text-slate-400">
								Rejoignez l'univers Transcendence
							</p>
						</div>

						<div className="flex items-center justify-between mb-8">
							<div className="flex-1 relative">
								<div className="h-2 bg-slate-700 rounded-full overflow-hidden">
									<div
										className={`h-full bg-linear-to-r from-blue-500 to-purple-500 transition-all duration-500 ${step === 1 ? "w-1/2" : "w-full"
											}`}
									/>
								</div>
							</div>
							<div className="mx-4 text-sm font-medium text-slate-300 bg-slate-700/50 px-3 py-1 rounded-full">
								{step}/2
							</div>
						</div>

						{message && (
							<div
								className={`mb-6 p-4 rounded-lg border ${isError
									? "bg-red-500/10 border-red-500/30 text-red-400"
									: "bg-green-500/10 border-green-500/30 text-green-400"
									}`}
							>
								<p className="text-center text-sm">{message}</p>
							</div>
						)}

						{step === 1 && (
							<div>
								<h3 className="text-xl font-semibold text-center mb-6 text-transparent bg-clip-text bg-linear-to-r from-blue-300 to-purple-300">
									Vos informations
								</h3>

								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-slate-300 mb-2">
											Email
										</label>
										<input
											type="email"
											className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
											value={email}
											onChange={(e) =>
												setEmail(e.target.value)
											}
											placeholder="votre@email.com"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-slate-300 mb-2">
											Pseudo
										</label>
										<input
											type="text"
											className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
											value={displayName}
											onChange={(e) =>
												setDisplayName(e.target.value)
											}
											placeholder="Votre pseudo"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-slate-300 mb-2">
											Mot de passe
										</label>
										<input
											type="password"
											className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
											value={password}
											onChange={(e) =>
												setPassword(e.target.value)
											}
											placeholder="••••••••"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-slate-300 mb-2">
											Confirmer le mot de passe
										</label>
										<input
											type="password"
											className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
											value={confirmPassword}
											onChange={(e) =>
												setConfirmPassword(
													e.target.value
												)
											}
											placeholder="••••••••"
										/>
									</div>
								</div>

								<button
									onClick={handleNextStep}
									className="w-full mt-8 py-3 px-6 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
								>
									<span>Suivant</span>
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</button>
							</div>
						)}

						{step === 2 && (
							<form onSubmit={handleSubmit}>
								<h3 className="text-xl font-semibold text-center mb-6 text-transparent bg-clip-text bg-linear-to-r from-blue-300 to-purple-300">
									Choisissez votre avatar
								</h3>

								<div className="flex justify-center mb-8">
									<div className="relative">
										<img
											src={avatar}
											alt="Avatar selectionne"
											className="w-32 h-32 rounded-full object-cover border-4 border-blue-400/50 shadow-lg"
										/>
										<div className="absolute inset-0 rounded-full bg-linear-to-br from-blue-400/20 to-purple-400/20"></div>
									</div>
								</div>

								<div className="grid grid-cols-5 gap-3 mb-8">
									{predefinedAvatars.map((a) => (
										<div key={a} className="relative group">
											<img
												src={a}
												alt="Avatar"
												className={`w-16 h-16 rounded-full object-cover border-2 cursor-pointer transition-all duration-200 group-hover:scale-110 ${avatar === a
													? "border-blue-400 shadow-lg shadow-blue-400/50"
													: "border-slate-600 hover:border-slate-400"
													}`}
												onClick={() => setAvatar(a)}
											/>
											{avatar === a && (
												<div className="absolute inset-0 rounded-full bg-linear-to-br from-blue-400/30 to-purple-400/30"></div>
											)}
										</div>
									))}
								</div>

								<div className="flex justify-between space-x-4">
									<button
										type="button"
										onClick={() => setStep(1)}
										className="flex-1 py-3 px-6 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-semibold rounded-lg transition-all duration-200 border border-slate-600 hover:border-slate-500 flex items-center justify-center space-x-2"
									>
										<svg
											className="w-5 h-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M15 19l-7-7 7-7"
											/>
										</svg>
										<span>Retour</span>
									</button>
									<button
										type="submit"
										className="flex-1 py-3 px-6 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
									>
										<svg
											className="w-5 h-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M5 13l4 4L19 7"
											/>
										</svg>
										<span>S'inscrire</span>
									</button>
								</div>
							</form>
						)}

						<div className="mt-8 pt-6 border-t border-slate-600/30">
							<div className="text-center">
								<p className="text-slate-400 text-sm">
									Dejà inscrit ?{" "}
									<button
										onClick={() => navigate("/connection")}
										className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium"
									>
										Se connecter
									</button>
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}