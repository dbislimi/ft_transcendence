import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SpaceBackground from "../Components/SpaceBackground";
import ShopModal from "../Components/ShopModal";
import { useUser } from "../contexts/UserContext";

export default function Home() {
	const { t } = useTranslation();
	const { isAuthenticated, user } = useUser();
	const [isLoaded, setIsLoaded] = useState(false);
	const [openShop, setOpenShop] = useState(false);

	useEffect(() => {
		setIsLoaded(true);
	}, []);

	const handleMouseMove = (e: React.MouseEvent) => {
		const { clientX, clientY } = e;
		const moveX = clientX - window.innerWidth / 2;
		const moveY = clientY - window.innerHeight / 2;
		const offset = 15;
		document.documentElement.style.setProperty(
			"--move-x",
			`${moveX / offset}px`
		);
		document.documentElement.style.setProperty(
			"--move-y",
			`${moveY / offset}px`
		);
	};

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
							<h1
								className="text-5xl md:text-7xl cyberpunk-title cyberpunk-glitch"
								data-text="TRANSCENDENCE"
							>
								TRANSCENDENCE
							</h1>
						</div>

            {isAuthenticated && user && (
              <div className="mb-8">
                <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-full px-6 py-3">
                  <span className="text-2xl">👋</span>
                  <p className="text-aesthetic-accent text-lg font-medium">
                    {t('home.welcome', { name: user.display_name || user.name })}
                  </p>
                </div>
              </div>
            )}

						<div className="mb-16">
							<p className="text-xl md:text-2xl home-subtitle-adaptive font-light leading-relaxed max-w-3xl mx-auto">
								{t("home.subtitle")}
							</p>
							<div className="mt-4 flex justify-center space-x-2">
								{[...Array(3)].map((_, i) => (
									<div
										key={i}
										className="w-2 h-2 accent-adaptive rounded-full animate-bounce"
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
							{!isAuthenticated && (
								<>
									{/* Bouton Connexion */}
									<Link
										to={"/Connection"}
										className="action-btn-aesthetic"
									>
										<div className="flex flex-col items-center gap-3">
											<svg
												className="w-8 h-8 text-blue-400"
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
											<h3 className="text-lg font-semibold btn-text-aesthetic">
												{t("home.connectBtn")}
											</h3>
											<p className="text-sm description-aesthetic">
												{t("home.connectDesc")}
											</p>
										</div>
									</Link>

									{/* Bouton Inscription */}
									<Link
										to={"/Registration"}
										className="action-btn-aesthetic"
									>
										<div className="flex flex-col items-center gap-3">
											<svg
												className="w-8 h-8 text-green-400"
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
											<h3 className="text-lg font-semibold btn-text-aesthetic">
												{t("home.registrationBtn")}
											</h3>
											<p className="text-sm description-aesthetic">
												{t("home.registrationDesc")}
											</p>
										</div>
									</Link>
								</>
							)}

							<Link to={"/pong"} className="action-btn-aesthetic">
								<div className="flex flex-col items-center gap-3">
									<svg
										className="w-8 h-8 text-purple-400"
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
									<h3 className="text-lg font-semibold btn-text-aesthetic">
										{t("home.pongTitle")}
									</h3>
									<p className="text-sm description-aesthetic">
										{t("home.pongDesc")}
									</p>
								</div>
							</Link>

							<button
								className="action-btn-aesthetic"
								onClick={() => setOpenShop(true)}
							>
								<div className="flex flex-col items-center gap-3">
									<svg
										className="w-8 h-8 text-orange-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
										/>
									</svg>
									<h3 className="text-lg font-semibold btn-text-aesthetic">
										{t("shop.title")}
									</h3>
									<p className="text-sm description-aesthetic">
										{t("home.shopDesc")}
									</p>
								</div>
							</button>

							<Link
								to={"/bomb-party"}
								className="action-btn-aesthetic"
							>
								<div className="flex flex-col items-center gap-3">
									<svg
										className="w-8 h-8 text-red-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
										/>
									</svg>
									<h3 className="text-lg font-semibold btn-text-aesthetic">
										{t("home.bombPartyTitle")}
									</h3>
									<p className="text-sm description-aesthetic">
										{t("home.bombPartyDesc")}
									</p>
								</div>
							</Link>

							<Link
								to={"/about"}
								className="action-btn-aesthetic"
							>
								<div className="flex flex-col items-center gap-3">
									<svg
										className="w-8 h-8 text-orange-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<h3 className="text-lg font-semibold btn-text-aesthetic">
										{t("home.aboutBtn")}
									</h3>
									<p className="text-sm description-aesthetic">
										{t("home.aboutDesc")}
									</p>
								</div>
							</Link>
						</div>

						<div className="mt-16">
							<p className="text-lg text-gray-300 font-medium">
								{t("home.readyToTranscend")}
							</p>
							<p className="text-sm text-gray-400 mt-2">
								{t("home.optimalPerformance")}
							</p>
						</div>
					</div>
				</div>

				{openShop && (
					<ShopModal
						isOpen={openShop}
						onClose={() => setOpenShop(false)}
					/>
				)}
			</div>
		</>
	);
}
