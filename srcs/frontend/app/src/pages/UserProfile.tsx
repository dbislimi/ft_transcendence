import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../Components/SpaceBackground";
import { API_BASE_URL } from "../config/api";

interface UserStats {
	totalGames: number;
	wins: number;
	losses: number;
	winRate: number;
	botWins: number;
	playerWins: number;
	tournamentsWon: number;
}

interface Match {
	id: number;
	opponent: {
		name: string;
		avatar: string;
		isBot: boolean;
	};
	isWinner: boolean;
	scores: number[] | null;
	date: string;
	matchType?: string;
}

interface UserProfile {
	id: number;
	display_name: string;
	name: string;
	avatar: string;
	online: number;
	wins: number;
	losses: number;
	tournaments_won: number;
}

export default function UserProfile() {
	const { t } = useTranslation();
	const { userId } = useParams<{ userId: string }>();
	const navigate = useNavigate();
	const [user, setUser] = useState<UserProfile | null>(null);
	const [stats, setStats] = useState<UserStats | null>(null);
	const [matchHistory, setMatchHistory] = useState<Match[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");

	useEffect(() => {
		const fetchUserData = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					navigate("/Connection");
					return;
				}

				console.log("[UserProfile] Chargement profil pour userId:", userId);

				// Fetch user profile
				const userRes = await fetch(`${API_BASE_URL}/api/user/${userId}`, {
					headers: { Authorization: `Bearer ${token}` },
				});

				console.log("[UserProfile] Réponse user:", userRes.status, userRes.ok);

				if (!userRes.ok) {
					const errorData = await userRes.json();
					console.error("[UserProfile] Erreur réponse:", errorData);
					throw new Error(errorData.error || "User not found");
				}
				const userData = await userRes.json();
				console.log("[UserProfile] User data reçu:", userData);
				setUser(userData.user);

				// Fetch user stats
				const statsRes = await fetch(`${API_BASE_URL}/api/user-stats/${userId}`, {
					headers: { Authorization: `Bearer ${token}` },
				});

				if (statsRes.ok) {
					const statsData = await statsRes.json();
					setStats(statsData);
				}

				// Fetch match history
				const historyRes = await fetch(`${API_BASE_URL}/api/match-history/${userId}`, {
					headers: { Authorization: `Bearer ${token}` },
				});

				if (historyRes.ok) {
					const historyData = await historyRes.json();
					setMatchHistory(historyData);
				}

				setLoading(false);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Error loading profile");
				setLoading(false);
			}
		};

		if (userId) {
			fetchUserData();
		}
	}, [userId, navigate]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<SpaceBackground />
				<div className="text-white text-xl">Loading...</div>
			</div>
		);
	}

	if (error || !user) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<SpaceBackground />
				<div className="text-red-500 text-xl">{error || "User not found"}</div>
			</div>
		);
	}

	return (
		<>
			<SpaceBackground />
			<div className="relative min-h-screen py-8 px-4">
				<div className="max-w-5xl mx-auto">
					{/* Back button */}
					<button
						onClick={() => navigate(-1)}
						className="mb-4 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-white rounded-lg transition-colors"
					>
						← {t('common.back') || 'Back'}
					</button>

					{/* User Header */}
					<div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-gray-700/50">
						<div className="flex items-center gap-6">
							<img
								src={user.avatar || "/avatars/avatar1.png"}
								alt={user.display_name}
								className="w-24 h-24 rounded-full border-4 border-blue-500"
							/>
							<div className="flex-1">
								<div className="flex items-center gap-3">
									<h1 className="text-3xl font-bold text-white">
										{user.display_name || user.name}
									</h1>
									<span
										className={`px-3 py-1 rounded-full text-sm ${
											user.online
												? "bg-green-500/20 text-green-400"
												: "bg-gray-500/20 text-gray-400"
										}`}
									>
										{user.online ? "🟢 Online" : "⚫ Offline"}
									</span>
								</div>
								<div className="mt-4 flex gap-6 text-sm">
									<div className="text-center">
										<div className="text-2xl font-bold text-green-400">{user.wins}</div>
										<div className="text-gray-400">{t('profile.wins') || 'Wins'}</div>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-red-400">{user.losses}</div>
										<div className="text-gray-400">{t('profile.losses') || 'Losses'}</div>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-yellow-400">{user.tournaments_won}</div>
										<div className="text-gray-400">{t('profile.tournaments') || 'Tournaments'}</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Tabs */}
					<div className="flex gap-2 mb-6">
						<button
							onClick={() => setActiveTab("overview")}
							className={`px-6 py-3 rounded-lg font-medium transition-colors ${
								activeTab === "overview"
									? "bg-blue-600 text-white"
									: "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
							}`}
						>
							{t('profile.overview') || 'Overview'}
						</button>
						<button
							onClick={() => setActiveTab("history")}
							className={`px-6 py-3 rounded-lg font-medium transition-colors ${
								activeTab === "history"
									? "bg-blue-600 text-white"
									: "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
							}`}
						>
							{t('profile.matchHistory') || 'Match History'}
						</button>
					</div>

					{/* Content */}
					{activeTab === "overview" && stats && (
						<div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
							<h2 className="text-2xl font-bold text-white mb-4">{t('profile.statistics') || 'Statistics'}</h2>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
								<div className="bg-gray-800/50 p-4 rounded-lg">
									<div className="text-gray-400 text-sm">{t('profile.totalGames') || 'Total Games'}</div>
									<div className="text-2xl font-bold text-white">{stats.totalGames}</div>
								</div>
								<div className="bg-gray-800/50 p-4 rounded-lg">
									<div className="text-gray-400 text-sm">{t('profile.winRate') || 'Win Rate'}</div>
									<div className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</div>
								</div>
								<div className="bg-gray-800/50 p-4 rounded-lg">
									<div className="text-gray-400 text-sm">{t('profile.vsPlayers') || 'Vs Players'}</div>
									<div className="text-2xl font-bold text-white">{stats.playerWins}</div>
								</div>
								<div className="bg-gray-800/50 p-4 rounded-lg">
									<div className="text-gray-400 text-sm">{t('profile.vsBots') || 'Vs Bots'}</div>
									<div className="text-2xl font-bold text-white">{stats.botWins}</div>
								</div>
							</div>
						</div>
					)}

					{activeTab === "history" && (
						<div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
							<h2 className="text-2xl font-bold text-white mb-4">{t('profile.matchHistory') || 'Match History'}</h2>
							{matchHistory.length === 0 ? (
								<div className="text-center text-gray-400 py-8">
									{t('profile.noMatches') || 'No matches yet'}
								</div>
							) : (
								<div className="space-y-3">
									{matchHistory.map((match) => (
										<div
											key={match.id}
											className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between"
										>
											<div className="flex items-center gap-4">
												<img
													src={match.opponent.avatar || "/avatars/avatar1.png"}
													alt={match.opponent.name}
													className="w-12 h-12 rounded-full"
												/>
												<div>
													<div className="text-white font-medium">
														vs {match.opponent.name}
														{match.opponent.isBot && " 🤖"}
													</div>
													<div className="text-sm text-gray-400">
														{new Date(match.date).toLocaleDateString()}
													</div>
												</div>
											</div>
											<div className="text-right">
												<div
													className={`font-bold ${
														match.isWinner ? "text-green-400" : "text-red-400"
													}`}
												>
													{match.isWinner ? "WIN" : "LOSS"}
												</div>
												{match.scores && (
													<div className="text-sm text-gray-400">
														{match.scores.join(" - ")}
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</>
	);
}
