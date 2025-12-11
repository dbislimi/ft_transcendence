import React from "react";
import { useTranslation } from "react-i18next";
import type { UserStats } from "./BombPartyStatsTypes";

interface BombPartyStatsSummaryProps {
	userStats: UserStats | null;
	globalStats: any;
	isAuthenticated: boolean;
}

export function BombPartyStatsSummary({
	userStats,
	globalStats,
	isAuthenticated,
}: BombPartyStatsSummaryProps) {
	const { t } = useTranslation();
	const formatDuration = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}h ${minutes}m ${secs}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		} else {
			return `${secs}s`;
		}
	};

	const formatDate = (date: Date): string => {
		return new Date(date).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
					<svg
						className="w-6 h-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					{t("bombParty.stats.global.title") ||
						"Statistiques Globales"}
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 p-6 rounded-lg border border-blue-500/30">
						<div className="text-4xl font-bold text-blue-300 mb-2">
							{globalStats.totalPlayers}
						</div>
						<div className="text-gray-300">
							{t("bombParty.stats.global.totalPlayers") ||
								"Joueurs"}
						</div>
					</div>
					<div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-6 rounded-lg border border-purple-500/30">
						<div className="text-4xl font-bold text-purple-300 mb-2">
							{globalStats.totalMatches}
						</div>
						<div className="text-gray-300">
							{t("bombParty.stats.global.totalMatches") ||
								"Parties jouées"}
						</div>
					</div>
					<div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 p-6 rounded-lg border border-green-500/30">
						<div className="text-4xl font-bold text-green-300 mb-2">
							{globalStats.totalValidWords}
						</div>
						<div className="text-gray-300">
							{t("bombParty.stats.global.totalWords") ||
								"Mots validés"}
						</div>
					</div>
				</div>
			</div>

			{isAuthenticated && userStats && (
				<div>
					<h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
						<svg
							className="w-6 h-6"
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
						{t("bombParty.stats.personal.title") ||
							"Mes Statistiques"}
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div className="bg-slate-800 p-6 rounded-lg">
							<h3 className="text-lg font-semibold text-cyan-400 mb-4">
								{t("bombParty.stats.overview.matchStats")}
							</h3>
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-slate-400">
										{t(
											"bombParty.stats.overview.totalMatches"
										)}
										:
									</span>
									<span className="text-white font-semibold">
										{userStats.totalMatches ?? 0}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-slate-400">
										{t(
											"bombParty.stats.overview.totalWins"
										)}
										:
									</span>
									<span className="text-green-400 font-semibold">
										{userStats.totalWins ?? 0}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-slate-400">
										{t("bombParty.stats.overview.winRate")}:
									</span>
									<span className="text-green-400 font-semibold">
										{userStats.winRate != null
											? userStats.winRate.toFixed(1)
											: "0.0"}
										%
									</span>
								</div>
							</div>
						</div>

						<div className="bg-slate-800 p-6 rounded-lg">
							<h3 className="text-lg font-semibold text-cyan-400 mb-4">
								{t("bombParty.stats.overview.wordStats")}
							</h3>
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-slate-400">
										{t(
											"bombParty.stats.overview.totalValidWords"
										)}
										:
									</span>
									<span className="text-green-400 font-semibold">
										{userStats.totalValidWords ?? 0}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-slate-400">
										{t(
											"bombParty.stats.overview.bestStreak"
										)}
										:
									</span>
									<span className="text-yellow-400 font-semibold">
										{userStats.bestStreak ?? 0}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-slate-400">
										{t("bombParty.stats.overview.accuracy")}
										:
									</span>
									<span className="text-green-400 font-semibold">
										{userStats.accuracy != null
											? userStats.accuracy.toFixed(1)
											: "0.0"}
										%
									</span>
								</div>
							</div>
						</div>

						<div className="bg-slate-800 p-6 rounded-lg">
							<h3 className="text-lg font-semibold text-cyan-400 mb-4">
								{t("bombParty.stats.overview.otherStats")}
							</h3>
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-slate-400">
										{t(
											"bombParty.stats.overview.totalPlayTime"
										)}
										:
									</span>
									<span className="text-white font-semibold">
										{formatDuration(
											userStats.totalPlayTime ?? 0
										)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-slate-400">
										{t(
											"bombParty.stats.overview.averageResponseTime"
										)}
										:
									</span>
									<span className="text-blue-400 font-semibold">
										{userStats.averageResponseTime != null
											? (
													userStats.averageResponseTime /
													1000
											  ).toFixed(1)
											: "0.0"}
										s
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
