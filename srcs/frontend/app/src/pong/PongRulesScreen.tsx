import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useUser } from "../contexts/UserContext";
import { useGameSettings } from "../contexts/GameSettingsContext";

interface PongRulesScreenProps {
	onContinue: (mode: "offline" | "online", config?: any) => void;
	onSettings?: () => void;
}

export default function PongRulesScreen({
	onContinue,
	onSettings,
}: PongRulesScreenProps) {
	const { t } = useTranslation();
	const { isAuthenticated, user, setGuestName } = useUser();
	const { bonusEnabled, setBonusEnabled } = useGameSettings();
	const [selectedMode, setSelectedMode] = useState<
		"offline" | "online" | null
	>(null);

	const [offlineMode, setOfflineMode] = useState<"solo" | "duo">("solo");
	const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
		"medium"
	);

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
		<>
			<div className="min-h-screen flex items-center justify-center p-4">
				<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-2xl w-full shadow-2xl relative">
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
							{t("pong.rules.title")}
						</h1>
						<div className="flex gap-2 items-center">
							<span className="text-xs text-slate-400">
								{t("pong.rules.bonus")}
							</span>
							<button
								onClick={() => setBonusEnabled(!bonusEnabled)}
								className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
									bonusEnabled
										? "bg-purple-500"
										: "bg-slate-600"
								}`}
								aria-label="Toggle bonus"
							>
								<span
									className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
										bonusEnabled
											? "translate-x-5"
											: "translate-x-1"
									}`}
								/>
							</button>
							{onSettings && (
								<button
									onClick={onSettings}
									className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-white"
									aria-label={t("nav.settings")}
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
								"The bounce angle depends on the impact point on the paddle."}
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
							{t("pong.rules.modeSelection")}
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
									🎮 {t("pong.rules.offlineMode")}
								</div>
								<div className="text-sm opacity-80">
									{t("pong.rules.offlineModeDesc")}
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
									🌐 {t("pong.rules.onlineMode")}
								</div>
								<div className="text-sm opacity-80">
									{t("pong.rules.onlineModeDesc")}
								</div>
							</button>
						</div>

						{selectedMode === "offline" && (
							<div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-green-500/30 space-y-4 animate-fadeIn">
								<div>
									<h4 className="text-lg font-semibold text-green-400 mb-2">
										{t("pong.rules.players")}
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
											{t("pong.rules.solo")}
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
											{t("pong.rules.duo")}
										</button>
									</div>
								</div>

								{offlineMode === "solo" && (
									<div>
										<h4 className="text-lg font-semibold text-green-400 mb-2">
											{t("pong.rules.difficulty")}
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
									{t("pong.rules.startOffline")}
								</button>
							</div>
						)}

						{selectedMode === "online" && (
							<div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-cyan-500/30 space-y-4 animate-fadeIn">
								{!isAuthenticated && (
									<div>
										<h4 className="text-lg font-semibold text-cyan-400 mb-2">
											{t("pong.rules.enterName")}
										</h4>
										<input
											type="text"
											value={user?.name || ""}
											onChange={(e) =>
												setGuestName(e.target.value)
											}
											placeholder={t(
												"pong.rules.namePlaceholder"
											)}
											className="w-full py-2 px-4 rounded border bg-slate-800/50 border-slate-600 text-slate-300 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
											maxLength={20}
										/>
									</div>
								)}
								<h4 className="text-lg font-semibold text-cyan-400 mb-2">
									{t("pong.rules.matchType")}
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
											⚡ {t("pong.rules.quickMatch")}
										</span>
										<span className="text-xs opacity-70">
											{t("pong.rules.quickMatchDesc")}
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
											🏆 {t("pong.rules.tournament")}
										</span>
										<span className="text-xs opacity-70">
											{t("pong.rules.tournamentDesc")}
										</span>
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
