import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import SpaceBackground from "../Components/SpaceBackground";
import BackgroundPicker from "../Components/BackgroundPicker";
import { useUser } from "../context/UserContext";
import ActionButton from "../Components/ActionButton";
import { useNavigate } from "react-router-dom";

export default function Home() {
	const navigate = useNavigate();

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const token = params.get("token");
		const require2fa = params.get("require2fa");

		if (token) {
			localStorage.setItem("token", token);
			const cleanUrl = window.location.origin + window.location.pathname;
			window.history.replaceState({}, document.title, cleanUrl);
			navigate("/dashboard");
		} else if (require2fa == "1") {
			const cleanUrl = window.location.origin + window.location.pathname;
			window.history.replaceState({}, document.title, cleanUrl);
			navigate("/auth");
		}
	}, []);

	const { t } = useTranslation();
	const { user, token } = useUser();
	const isAuthenticated = !!token && !!user;
	const [isLoaded, setIsLoaded] = useState(false);
	const [openPicker, setOpenPicker] = useState(false);

	useEffect(() => {
		setIsLoaded(true);
	}, []);

	const handleMouseMove = (_e: React.MouseEvent) => {};

	return (
		<>
			<SpaceBackground />
			<div
				className="relative min-h-screen overflow-hidden"
				onMouseMove={handleMouseMove}
			>
				<div
					className={`relative z-10 min-h-screen transition-all duration-1000 ${
						isLoaded
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
					}`}
				>
					<div className="text-center max-w-6xl mx-auto px-6 flex flex-col items-center justify-center min-h-screen">
						<div className="relative mb-12">
							<div className="absolute inset-0 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-100 blur-xl opacity-20 animate-pulse"></div>
							<h1 className="relative text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-gray-100 to-white tracking-wider">
								TRANSCENDENCE
							</h1>
							<div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded-full opacity-50"></div>
						</div>
						{isAuthenticated && user && (
							<div className="mb-8">
								<div className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-full px-6 py-3">
									<span className="text-2xl">👋</span>
									<p className="text-green-300 text-lg font-medium">
										Bienvenue, {user.display_name} !
									</p>
								</div>
							</div>
						)}
						<div className="mb-16">
							<p className="text-xl md:text-2xl text-gray-400 font-light leading-relaxed max-w-3xl mx-auto">
								{t("home.subtitle") ||
									"Défie tes limites dans l'univers du Pong"}
							</p>
							<div className="mt-4 flex justify-center space-x-2">
								{[...Array(3)].map((_, i) => (
									<div
										key={i}
										className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
										style={{
											animationDelay: `${i * 0.2}s`,
										}}
									/>
								))}
							</div>
						</div>
						<div
							className={`grid gap-8 max-w-5xl mx-auto ${
								isAuthenticated
									? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
									: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
							}`}
						>
							{/* Always show games */}
							<ActionButton
								to="/pong"
								color="purple"
								icon={
									<svg
										className="w-6 h-6 text-purple-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								}
								title="Pong"
								subtitle="Lancer Pong"
							/>
							<ActionButton
								to="/bomb-party"
								color="pink"
								icon={
									<span className="text-pink-400 text-xl">
										💣
									</span>
								}
								title="Bomb Party"
								subtitle="Lancer Bomb Party"
							/>
							{!isAuthenticated && (
								<>
									<ActionButton
										to="/Connection"
										color="blue"
										icon={
											<svg
												className="w-6 h-6 text-blue-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
												/>
											</svg>
										}
										title={
											t("home.connectBtn") || "Connexion"
										}
										subtitle="Accéder à ton compte"
									/>
									<ActionButton
										to="/Registration"
										color="green"
										icon={
											<svg
												className="w-6 h-6 text-green-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
												/>
											</svg>
										}
										title={
											t("home.registrationBtn") ||
											"Inscription"
										}
										subtitle="Rejoindre l'aventure"
									/>
								</>
							)}
							{isAuthenticated && (
								<>
									<ActionButton
										to="/profile"
										color="blue"
										icon={
											<svg
												className="w-6 h-6 text-blue-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
												/>
											</svg>
										}
										title="Mon profil"
										subtitle="Gérer mon compte"
									/>
									<ActionButton
										color="cyan"
										icon={
											<span className="text-cyan-400 text-xl">
												🖼️
											</span>
										}
										title="Boutique"
										subtitle="Choisir un arrière-plan"
										onClick={() => setOpenPicker(true)}
									/>
									<ActionButton
										to="/about"
										color="orange"
										icon={
											<svg
												className="w-6 h-6 text-orange-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
												/>
											</svg>
										}
										title={
											t("home.aboutBtn") ||
											"À propos de nous"
										}
										subtitle="Découvrir l'équipe"
									/>
								</>
							)}
						</div>
						<div className="mt-24 text-center">
							<div className="inline-flex items-center space-x-8 text-gray-500 text-sm">
								<div className="flex items-center space-x-2">
									<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
									<span>
										Prêt à transcender tes limites ?
									</span>
								</div>
								<div className="w-px h-4 bg-gray-600"></div>
								<div className="flex items-center space-x-2">
									<svg
										className="w-4 h-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M13 10V3L4 14h7v7l9-11h-7z"
										/>
									</svg>
									<span>Performance optimale</span>
								</div>
							</div>
						</div>
					</div>
				</div>
				{openPicker && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
						<div className="bg-slate-800 rounded-2xl p-6 max-w-3xl w-full mx-4">
							<h3 className="text-xl font-bold text-white mb-4">
								Arrière-plans
							</h3>
							<BackgroundPicker />
							<button
								onClick={() => setOpenPicker(false)}
								className="mt-6 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
							>
								Fermer
							</button>
						</div>
					</div>
				)}
			</div>
		</>
	);
}
