import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../Components/SpaceBackground";
import BackgroundSurface from "../Components/BackgroundSurface";

interface RulesScreenProps {
	onContinue: (gameMode: 'local' | 'multiplayer', playersCount?: number, multiplayerType?: 'tournament' | 'quickmatch') => void;
	onBack?: () => void;
	initialMultiplayerType?: 'tournament' | 'quickmatch' | null; // Pour revenir au choix multijoueur depuis le lobby
}

export default function RulesScreen({ onContinue, onBack, initialMultiplayerType }: RulesScreenProps) {
	const { t } = useTranslation();
	// Si initialMultiplayerType est défini, on affiche directement le choix multijoueur
	const [selectedMode, setSelectedMode] = React.useState<'local' | 'multiplayer' | null>(
		initialMultiplayerType ? 'multiplayer' : null
	);
	const [localPlayers, setLocalPlayers] = React.useState(2);
	
	// Réinitialiser selectedMode si initialMultiplayerType change
	React.useEffect(() => {
		if (initialMultiplayerType) {
			setSelectedMode('multiplayer');
		}
	}, [initialMultiplayerType]);

	const handleModeClick = (mode: 'local' | 'multiplayer') => {
		setSelectedMode(mode);
	};

	const handleMultiplayerTypeClick = (type: 'tournament' | 'quickmatch') => {
		// passe directement au lobby sans etape intermediaire pour les deux modes
		onContinue('multiplayer', undefined, type);
	};

	const handleContinue = () => {
		if (selectedMode === 'local') {
			onContinue(selectedMode, localPlayers);
		}
	};

	const handleBack = () => {
		// Si on est dans la sélection du type multijoueur, revenir au choix du mode
		if (selectedMode === 'multiplayer') {
			setSelectedMode(null);
			// Si on vient du lobby (initialMultiplayerType défini), réinitialiser aussi le type
			// en appelant onContinue avec null pour réinitialiser l'état
			if (initialMultiplayerType) {
				// Réinitialiser le type multijoueur en passant null
				onContinue('multiplayer', undefined, undefined);
			}
			return; // Important : ne pas appeler onBack dans ce cas
		}
		// Si on est dans la sélection du mode local, revenir au choix initial
		if (selectedMode === 'local') {
			setSelectedMode(null);
			return; // Important : ne pas appeler onBack dans ce cas
		}
		// Sinon, utiliser le callback onBack pour revenir à la page précédente
		if (onBack) {
			onBack();
		}
	};

	return (
		<BackgroundSurface game="bombparty">
		<SpaceBackground />
			<div className="min-h-screen flex items-center justify-center p-6">
				<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-2xl w-full shadow-2xl relative">
					{/* Header avec boutons */}
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
							{t("bombParty.rules.title")}
						</h1>
						<div className="flex items-center gap-2">
							{/* Bouton Stats - Design sobre et cohérent */}
							<Link
								to="/bomb-party/stats"
								className="px-4 py-2 rounded-lg border border-cyan-400 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20 hover:text-cyan-200 transition-all duration-200"
							>
								Statistics
							</Link>
							{/* Bouton Retour - Même style que le lobby */}
							{(onBack || selectedMode !== null) && (
								<button
									type="button"
									onClick={handleBack}
									className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-white"
									aria-label="Retour"
								>
									{t("common.back")}
								</button>
							)}
						</div>
					</div>

					{/* Affichage conditionnel selon le mode sélectionné */}
					{selectedMode !== 'multiplayer' && (
						<>
							<div className="text-amber-300 text-sm mb-3">
								{t("bombParty.rules.languageNotice")}
							</div>
							<ul className="text-slate-300 space-y-2 list-disc list-inside">
								<li>{t("bombParty.rules.rule1")}</li>
								<li>{t("bombParty.rules.rule2")}</li>
								<li>{t("bombParty.rules.rule3")}</li>
								<li>{t("bombParty.rules.rule4")}</li>
							</ul>
							
							{/* Choix du mode de jeu */}
							<div className="mt-6 space-y-4">
								<h3 className="text-xl font-semibold text-slate-200 mb-3">{t("bombParty.rules.modeSelection")}</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<button
										type="button"
										onClick={() => handleModeClick('local')}
										className={`py-4 px-6 rounded-lg transition-all border ${
											selectedMode === 'local'
												? 'bg-gradient-to-r from-green-600 to-emerald-600 border-green-500 text-white'
												: 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
										}`}
									>
										<div className="text-lg">🎮 {t("bombParty.rules.localMode")}</div>
										<div className="text-sm opacity-80">{t("bombParty.rules.localModeDesc")}</div>
									</button>
									<button
										type="button"
										onClick={() => handleModeClick('multiplayer')}
										className="py-4 px-6 rounded-lg transition-all border bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
									>
										<div className="text-lg">🌐 {t("bombParty.rules.multiplayerMode")}</div>
										<div className="text-sm opacity-80">{t("bombParty.rules.multiplayerModeDesc")}</div>
									</button>
								</div>

								{/* Sélection du nombre de joueurs pour le mode local */}
								{selectedMode === 'local' && (
									<div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-green-500/30">
										<h4 className="text-lg font-semibold text-green-400 mb-3">{t("bombParty.rules.localPlayers")} :</h4>
										<div className="flex items-center space-x-4">
											<button
												type="button"
												onClick={() => setLocalPlayers(Math.max(2, localPlayers - 1))}
												className="w-10 h-10 bg-slate-600 hover:bg-slate-500 rounded-lg flex items-center justify-center text-white font-bold"
											>
												-
											</button>
											<span className="text-2xl font-bold text-white min-w-[3rem] text-center">
												{localPlayers}
											</span>
											<button
												type="button"
												onClick={() => setLocalPlayers(Math.min(12, localPlayers + 1))}
												className="w-10 h-10 bg-slate-600 hover:bg-slate-500 rounded-lg flex items-center justify-center text-white font-bold"
											>
												+
											</button>
											<div className="text-sm text-slate-400 ml-4">
												{`${localPlayers} ${t("bombParty.rules.players")}`}
											</div>
										</div>
									</div>
								)}

								{/* Bouton continuer pour le mode local */}
								{selectedMode === 'local' && (
									<button
										type="button"
										onClick={handleContinue}
										className="w-full py-3 px-6 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all"
									>
										{`${t("bombParty.rules.startLocalGame")} (${localPlayers} ${t("bombParty.rules.players")})`}
									</button>
								)}
							</div>
						</>
					)}

					{/* Sélection du type de partie multijoueur (Tournoi ou Partie rapide) */}
					{selectedMode === 'multiplayer' && (
						<div className="mt-6 space-y-4">
							<h3 className="text-xl font-semibold text-slate-200 mb-3">{t("bombParty.rules.multiplayerTypeSelection")}</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<button
									type="button"
									onClick={() => handleMultiplayerTypeClick('tournament')}
									className="py-4 px-6 rounded-lg transition-all border bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
								>
									<div className="text-lg">🏆 {t("bombParty.rules.tournamentMode")}</div>
									<div className="text-sm opacity-80">{t("bombParty.rules.tournamentModeDesc")}</div>
								</button>
								<button
									type="button"
									onClick={() => handleMultiplayerTypeClick('quickmatch')}
									className="py-4 px-6 rounded-lg transition-all border bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
								>
									<div className="text-lg">⚡ {t("bombParty.rules.quickmatchMode")}</div>
									<div className="text-sm opacity-80">{t("bombParty.rules.quickmatchModeDesc")}</div>
								</button>
							</div>
						</div>
					)}

				</div>
			</div>

			{/* Background picker modal removed */}
		</BackgroundSurface>
	);
}
