import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import BackgroundSurface from "../Components/BackgroundSurface";
import { useUser } from "../contexts/UserContext";

interface PongRulesScreenProps {
	onContinue: (mode: "offline" | "online", config?: any) => void;
	onBack?: () => void;
	onSettings?: () => void;
	bonusEnabled: boolean;
	setBonusEnabled: (enabled: boolean) => void;
}

export default function PongRulesScreen({
	onContinue,
	onBack,
	onSettings,
	bonusEnabled,
	setBonusEnabled,
}: PongRulesScreenProps) {
	const { t } = useTranslation();
	const { isAuthenticated, user, setGuestName } = useUser();
	const [selectedMode, setSelectedMode] = React.useState<
		"offline" | "online" | null
	>(null);

	const [offlineMode, setOfflineMode] = React.useState<"solo" | "duo">(
		"solo"
	);
	const [difficulty, setDifficulty] = React.useState<
		"easy" | "medium" | "hard"
	>("medium");

	const handleModeClick = (mode: "offline" | "online") => {
		setSelectedMode(mode);
	};

	const handleOfflineStart = () => {
		onContinue("offline", {
			gamemode: offlineMode,
			botDiff: offlineMode === "solo" ? difficulty : null,
			bonus: bonusEnabled,
		});
	};

	const handleOnlineOption = (type: "quick" | "tournament") => {
		const name = user?.name;
		onContinue("online", { type, name, bonus: bonusEnabled });
	};

	return (
		<BackgroundSurface game="pong">
			<div className="min-h-screen flex items-center justify-center p-6">
				<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-2xl w-full shadow-2xl relative">
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
							{t("pong.rules.title") || "Pong Rules"}
						</h1>
						<div className="flex gap-2 items-center">
								<span className="text-xs text-slate-400">
									{t("pong.rules.bonus") || "Bonus"}
								</span>
								<button
									onClick={() => setBonusEnabled(!bonusEnabled)}
									className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
										bonusEnabled ? "bg-purple-500" : "bg-slate-600"
									}`}
									aria-label="Toggle bonus"
								>
									<span
										className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
											bonusEnabled ? "translate-x-5" : "translate-x-1"
										}`}
									/>
								</button>
							{onSettings && (
								<button
									onClick={onSettings}
									className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-white"
									aria-label={t("nav.settings") || "Settings"}
								>
									⚙️
								</button>
							)}
							<Link
								to="/"
								className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-white"
								aria-label={t("common.back") || "Back"}
							>
								{t("common.back") || "Back"}
							</Link>
						</div>
					</div>

					<ul className="text-slate-300 space-y-2 list-disc list-inside mb-6">
						<li>
							{t("pong.rules.rule1") ||
								"First to 11 points wins."}
						</li>
						<li>
							{t("pong.rules.rule2") ||
								"Use paddle to hit the ball."}
						</li>
						<li>
							{t("pong.rules.rule3") ||
								"Don't let the ball pass you."}
						</li>
						<li>
							{t("pong.rules.rule4") || "Bonuses may appear!"}
						</li>
					</ul>

				<div className="space-y-4">
						<h3 className="text-xl font-semibold text-slate-200 mb-3">
							{t("pong.rules.modeSelection") || "Select Mode"}
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<button
								type="button"
								onClick={() => handleModeClick("offline")}
								className={`py-4 px-6 rounded-lg transition-all border ${
									selectedMode === "offline"
										? "bg-gradient-to-r from-green-600 to-emerald-600 border-green-500 text-white"
										: "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
								}`}
							>
								<div className="text-lg">
									🎮{" "}
									{t("pong.rules.offlineMode") || "Offline"}
								</div>
								<div className="text-sm opacity-80">
									{t("pong.rules.offlineModeDesc") ||
										"Play locally or against bot"}
								</div>
							</button>
							<button
								type="button"
								onClick={() => handleModeClick("online")}
								className={`py-4 px-6 rounded-lg transition-all border ${
									selectedMode === "online"
										? "bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-500 text-white"
										: "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
								}`}
							>
								<div className="text-lg">
									🌐{" "}
									{t("pong.rules.onlineMode") ||
										"Multiplayer"}
								</div>
								<div className="text-sm opacity-80">
									{t("pong.rules.onlineModeDesc") ||
										"Play online with others"}
								</div>
							</button>
						</div>

						{selectedMode === "offline" && (
							<div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-green-500/30 space-y-4 animate-fadeIn">
								<div>
									<h4 className="text-lg font-semibold text-green-400 mb-2">
										{t("pong.rules.players") || "Players"}
									</h4>
									<div className="flex gap-4">
										<button
											onClick={() =>
												setOfflineMode("solo")
											}
											className={`flex-1 py-2 px-4 rounded border transition-colors ${
												offlineMode === "solo"
													? "bg-green-500/20 border-green-500 text-green-300"
													: "bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500"
											}`}
										>
											{t("pong.rules.solo") ||
												"Solo (vs Bot)"}
										</button>
										<button
											onClick={() =>
												setOfflineMode("duo")
											}
											className={`flex-1 py-2 px-4 rounded border transition-colors ${
												offlineMode === "duo"
													? "bg-green-500/20 border-green-500 text-green-300"
													: "bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500"
											}`}
										>
											{t("pong.rules.duo") ||
												"Duo (Local)"}
										</button>
									</div>
								</div>

								{offlineMode === "solo" && (
									<div>
										<h4 className="text-lg font-semibold text-green-400 mb-2">
											{t("pong.rules.difficulty") ||
												"Difficulty"}
										</h4>
										<div className="flex gap-2">
											{(
												[
													"easy",
													"medium",
													"hard",
												] as const
											).map((d) => (
												<button
													key={d}
													onClick={() =>
														setDifficulty(d)
													}
													className={`flex-1 py-2 px-4 rounded border transition-colors capitalize ${
														difficulty === d
															? "bg-green-500/20 border-green-500 text-green-300"
															: "bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500"
													}`}
												>
													{t(
														`pong.difficulty.${d}`
													) || d}
												</button>
											))}
										</div>
									</div>
								)}

								<button
									type="button"
									onClick={handleOfflineStart}
									className="w-full py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl mt-4"
								>
									{t("pong.rules.startOffline") ||
										"Start Game"}
								</button>
							</div>
						)}

						{selectedMode === "online" && (
							<div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-cyan-500/30 space-y-4 animate-fadeIn">
								{!isAuthenticated && (
									<div>
										<h4 className="text-lg font-semibold text-cyan-400 mb-2">
											{t("pong.rules.enterName") ||
												"Enter Your Name"}
										</h4>
										<input
											type="text"
											value={user?.name || ""}
											onChange={(e) =>
												setGuestName(e.target.value)
											}
											placeholder={
												t(
													"pong.rules.namePlaceholder"
												) || "Your name"
											}
											className="w-full py-2 px-4 rounded border bg-slate-800/50 border-slate-600 text-slate-300 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
											maxLength={20}
										/>
									</div>
								)}
								<h4 className="text-lg font-semibold text-cyan-400 mb-2">
									{t("pong.rules.matchType") || "Match Type"}
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<button
										onClick={() =>
											handleOnlineOption("quick")
										}
										disabled={
											!isAuthenticated &&
											(!user?.name ||
												user.name.trim() === "")
										}
										className={`py-3 px-4 rounded-lg border transition-all flex flex-col items-center gap-1 ${
											!isAuthenticated &&
											(!user?.name ||
												user.name.trim() === "")
												? "bg-slate-800/30 border-slate-700 text-slate-500 cursor-not-allowed opacity-50"
												: "bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-cyan-500 hover:text-cyan-300"
										}`}
									>
										<span className="text-lg font-bold">
											⚡{" "}
											{t("pong.rules.quickMatch") ||
												"Quick Match"}
										</span>
										<span className="text-xs opacity-70">
											{t("pong.rules.quickMatchDesc") ||
												"Find an opponent instantly"}
										</span>
									</button>
									<button
										onClick={() =>
											handleOnlineOption("tournament")
										}
										disabled={
											!isAuthenticated &&
											(!user?.name ||
												user.name.trim() === "")
										}
										className={`py-3 px-4 rounded-lg border transition-all flex flex-col items-center gap-1 ${
											!isAuthenticated &&
											(!user?.name ||
												user.name.trim() === "")
												? "bg-slate-800/30 border-slate-700 text-slate-500 cursor-not-allowed opacity-50"
												: "bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-purple-500 hover:text-purple-300"
										}`}
									>
										<span className="text-lg font-bold">
											🏆{" "}
											{t("pong.rules.tournament") ||
												"Tournament"}
										</span>
										<span className="text-xs opacity-70">
											{t("pong.rules.tournamentDesc") ||
												"Join or create a tournament"}
										</span>
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</BackgroundSurface>
	);
}
