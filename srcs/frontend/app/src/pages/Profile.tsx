import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../contexts/UserContext";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useGameSettings } from "../contexts/GameSettingsContext";
import { useNotifications } from "../contexts/NotificationContext";
import SpaceBackground from "../Components/SpaceBackground";
import ConfirmModal from "../Components/ConfirmModal";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../config/api";

interface Friend {
	id: number;
	display_name: string;
	avatar?: string;
	online?: number | boolean;
}

interface FriendRequest {
	sender_id: number;
	display_name: string;
	avatar?: string;
	status: string;
	type: "sent" | "received";
}

interface BlockedUser {
	id: number;
	display_name: string;
	avatar?: string;
	created_at: string;
}

interface Stats {
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

export default function Profile() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { user, refreshUser, token } = useUser();
	const { pongWsRef, friendsWsRef } = useWebSocket();
	const { bonusEnabled } = useGameSettings();
	const { notify } = useNotifications();
	const [activeTab, setActiveTab] = useState("overview");
	const [friendsSubTab, setFriendsSubTab] = useState<
		"list" | "requests" | "blocked"
	>("list");
	const [isLoaded, setIsLoaded] = useState(false);

	const [confirmModal, setConfirmModal] = useState({
		isOpen: false,
		title: "",
		message: "",
		type: "warning" as "danger" | "warning" | "info",
		onConfirm: () => {},
	});

	const [editMode, setEditMode] = useState(false);
	const [email, setEmail] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [password, setPassword] = useState("");
	const [avatar, setAvatar] = useState("/avatars/avatar1.png");
	const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
	const [customAvatar, setCustomAvatar] = useState<File | null>(null);
	const [customAvatarPreview, setCustomAvatarPreview] = useState<
		string | null
	>(null);
	const [uploadedCustomAvatar, setUploadedCustomAvatar] = useState<
		string | null
	>(null);
	const [uploadingAvatar, setUploadingAvatar] = useState(false);
	const [message, setMessage] = useState("");
	const [isError, setIsError] = useState(false);

	const [stats, setStats] = useState<Stats>({
		totalGames: 0,
		wins: 0,
		losses: 0,
		winRate: 0,
		botWins: 0,
		playerWins: 0,
		tournamentsWon: 0,
	});

	const [friends, setFriends] = useState<Friend[]>([]);
	const [requests, setRequests] = useState<FriendRequest[]>([]);
	const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
	const [newFriendName, setNewFriendName] = useState("");
	const [friendsLoading, setFriendsLoading] = useState(false);
	const [friendsError, setFriendsError] = useState<string | null>(null);
	const [wsStatus, setWsStatus] = useState<string>("Deconnecte");

	const wsRef = useRef<WebSocket | null>(null);

	const [matchHistory, setMatchHistory] = useState<Match[]>([]);
	const [historyPage, setHistoryPage] = useState(1);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [hasMoreHistory, setHasMoreHistory] = useState(true);

	const avatars = [
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

	const fetchFriends = () => {
		if (friendsWsRef.current?.readyState === WebSocket.OPEN) {
			friendsWsRef.current.send(JSON.stringify({ type: "get_friends" }));
		}
	};

	const fetchRequests = () => {
		if (friendsWsRef.current?.readyState === WebSocket.OPEN) {
			friendsWsRef.current.send(
				JSON.stringify({ type: "get_friend_requests" })
			);
		}
	};

	const fetchBlockedUsers = () => {
		if (friendsWsRef.current?.readyState === WebSocket.OPEN) {
			friendsWsRef.current.send(
				JSON.stringify({ type: "get_blocked_users" })
			);
		}
	};

	const fetchMatchHistory = async (page = 1) => {
		if (!token || !user) return;

		setHistoryLoading(true);
		try {
			const res = await fetch(
				`${API_BASE_URL}/api/match-history/${user.id}?page=${page}&limit=10`,
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			if (res.ok) {
				const matches = await res.json();
				if (page === 1) {
					setMatchHistory(matches);
				} else {
					setMatchHistory((prev) => [...prev, ...matches]);
				}
				setHasMoreHistory(matches.length === 10);
			}
		} catch (error) {
			console.error(
				"Erreur lors de la recuperation de l'historique:",
				error
			);
		} finally {
			setHistoryLoading(false);
		}
	};

	const fetchUserStats = async () => {
		if (!token || !user) return;

		try {
			const res = await fetch(
				`${API_BASE_URL}/api/user-stats/${user.id}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			if (res.ok) {
				const userStats = await res.json();

				setStats({
					...userStats,
				});
			}
		} catch (error) {
			console.error("Erreur lors de la recuperation des stats:", error);
		}
	};

	const fetchData = async () => {
		if (!token || !user) return;

		try {
			await Promise.all([
				fetchFriends(),
				fetchRequests(),
				fetchBlockedUsers(),
				fetchUserStats(),
				fetchMatchHistory(),
			]);
			setIsLoaded(true);
		} catch (error) {
			console.error("Erreur lors de la recuperation des donnees:", error);
		}
	};

	const loadMoreHistory = () => {
		if (!historyLoading && hasMoreHistory) {
			const nextPage = historyPage + 1;
			setHistoryPage(nextPage);
			fetchMatchHistory(nextPage);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const handleAddFriend = () => {
		if (!newFriendName.trim()) return;

		setFriendsLoading(true);
		setFriendsError(null);

		if (friendsWsRef.current?.readyState === WebSocket.OPEN) {
			friendsWsRef.current.send(
				JSON.stringify({
					type: "send_friend_request",
					display_name: newFriendName.trim(),
				})
			);
		} else {
			setFriendsError(t("errors.network"));
			setFriendsLoading(false);
		}
	};

	const handleAcceptRequest = (senderId: number) => {
		if (friendsWsRef.current?.readyState === WebSocket.OPEN) {
			friendsWsRef.current.send(
				JSON.stringify({
					type: "accept_friend_request",
					sender_id: senderId,
				})
			);
		} else {
			setFriendsError(t("errors.network"));
		}
	};

	const handleRejectRequest = (senderId: number) => {
		if (friendsWsRef.current?.readyState === WebSocket.OPEN) {
			friendsWsRef.current.send(
				JSON.stringify({
					type: "reject_friend_request",
					sender_id: senderId,
				})
			);
		} else {
			setFriendsError(t("errors.network"));
		}
	};

	const handleRemoveFriend = (friendId: number) => {
		setConfirmModal({
			isOpen: true,
			title: "🗑️ Supprimer cet ami",
			message: t("friends.confirmDelete"),
			type: "danger",
			onConfirm: () => {
				if (friendsWsRef.current?.readyState === WebSocket.OPEN) {
					friendsWsRef.current.send(
						JSON.stringify({
							type: "remove_friend",
							friend_id: friendId,
						})
					);
				} else {
					setFriendsError(t("errors.network"));
				}
				setConfirmModal({ ...confirmModal, isOpen: false });
			},
		});
	};

	const handleBlockUser = (userId: number) => {
		setConfirmModal({
			isOpen: true,
			title: "🚫 Bloquer cet utilisateur",
			message: t("friends.confirmBlock"),
			type: "warning",
			onConfirm: () => {
				if (friendsWsRef.current?.readyState === WebSocket.OPEN) {
					friendsWsRef.current.send(
						JSON.stringify({
							type: "block_user",
							user_id: userId,
						})
					);
				} else {
					setFriendsError(t("errors.network"));
				}
				setConfirmModal({ ...confirmModal, isOpen: false });
			},
		});
	};

	const handleUnblockUser = (userId: number) => {
		setConfirmModal({
			isOpen: true,
			title: "✅ Débloquer cet utilisateur",
			message: t("friends.confirmUnblock"),
			type: "info",
			onConfirm: () => {
				if (friendsWsRef.current?.readyState === WebSocket.OPEN) {
					friendsWsRef.current.send(
						JSON.stringify({
							type: "unblock_user",
							user_id: userId,
						})
					);
				} else {
					setFriendsError(t("errors.network"));
				}
				setConfirmModal({ ...confirmModal, isOpen: false });
			},
		});
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !friendsLoading) {
			handleAddFriend();
		}
	};

	const isOnline = (v?: number | boolean) => v === true || v === 1;

	useEffect(() => {
		fetchData();
	}, [user, token]);

	useEffect(() => {
		if (editMode && user) {
			setEmail(user.email || "");
			setDisplayName(user.display_name || "");
			setAvatar(user.avatar || "/avatars/avatar1.png");
			setSelectedAvatar(null);
			setPassword("");
			setCustomAvatar(null);
			setCustomAvatarPreview(null);
			setUploadedCustomAvatar(null);
		}
	}, [editMode, user]);

	useEffect(() => {
		const handleFriendsMessage = (event: CustomEvent) => {
			const data = event.detail;

			switch (data.type) {
				case "friends_list":
					if (data.data) {
						setFriends(data.data);
					} else if (data.error) {
						setFriendsError(data.error);
					}
					break;

				case "friend_requests_list":
					if (data.data) {
						setRequests(data.data);
					} else if (data.error) {
						setFriendsError(data.error);
					}
					break;

				case "blocked_users_list":
					if (data.data) {
						setBlockedUsers(data.data);
					} else if (data.error) {
						setFriendsError(data.error);
					}
					break;

				case "friend_request_sent":
					if (data.error) {
						setFriendsError(data.error);
						setFriendsLoading(false);
					} else {
						setNewFriendName("");
						setFriendsLoading(false);
						fetchRequests();
					}
					break;

				case "friend_request_accepted_response":
					if (data.error) {
						setFriendsError(data.error);
					} else {
						fetchFriends();
						fetchRequests();
					}
					break;

				case "friend_request_rejected_response":
					if (data.error) {
						setFriendsError(data.error);
					} else {
						fetchRequests();
					}
					break;

				case "friend_removed_response":
					if (data.error) {
						setFriendsError(data.error);
					} else {
						fetchFriends();
					}
					break;

				case "user_blocked_response":
					if (data.error) {
						setFriendsError(data.error);
					} else {
						fetchFriends();
						fetchRequests();
						fetchBlockedUsers();
					}
					break;

				case "user_unblocked_response":
					if (data.error) {
						setFriendsError(data.error);
					} else {
						fetchBlockedUsers();
					}
					break;

				case "friend_request_received":
					fetchRequests();
					break;

				case "friend_request_accepted":
					fetchFriends();
					fetchRequests();
					break;

				case "friend_request_rejected":
					fetchRequests();
					break;

				case "friend_removed":
					fetchFriends();
					break;

				case "user_blocked":
					fetchFriends();
					fetchRequests();
					break;

				case "status_update":
					setFriends((prev) =>
						prev.map((friend) =>
							friend.id === data.userId
								? { ...friend, online: data.online }
								: friend
						)
					);
					break;
			}
		};

		const handleRefreshFriendRequests = () => {
			fetchRequests();
		};

		window.addEventListener(
			"friendsWebSocketMessage",
			handleFriendsMessage as EventListener
		);
		window.addEventListener(
			"refreshFriendRequests",
			handleRefreshFriendRequests
		);

		return () => {
			window.removeEventListener(
				"friendsWebSocketMessage",
				handleFriendsMessage as EventListener
			);
			window.removeEventListener(
				"refreshFriendRequests",
				handleRefreshFriendRequests
			);
		};
	}, []);

	const validateEmail = (email: string) =>
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	const validateDisplayName = (pseudo: string) =>
		/^[a-zA-Z0-9-]+$/.test(pseudo);
	const validatePassword = (password: string) =>
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{6,}$/.test(
			password
		);

	const handleCustomAvatarChange = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (file) {
			if (file.size > 5 * 1024 * 1024) {
				setIsError(true);
				setMessage("L'image ne doit pas dépasser 5MB");
				setTimeout(() => setMessage(""), 3000);
				return;
			}

			if (!file.type.startsWith("image/")) {
				setIsError(true);
				setMessage("Veuillez sélectionner une image valide");
				setTimeout(() => setMessage(""), 3000);
				return;
			}

			setCustomAvatar(file);

			const reader = new FileReader();
			reader.onloadend = () => {
				setCustomAvatarPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleUploadCustomAvatar = async () => {
		if (!customAvatar || !token) return;

		setUploadingAvatar(true);
		setMessage("");
		setIsError(false);

		try {
			const formData = new FormData();
			formData.append("avatar", customAvatar);

			const res = await fetch(`${API_BASE_URL}/api/upload-avatar`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			});

			const data = await res.json();

			if (res.ok) {
				setIsError(false);
				setMessage(
					"Avatar uploadé avec succès ! Sélectionnez-le pour l'enregistrer."
				);

				setUploadedCustomAvatar(data.avatar);
				setCustomAvatar(null);
				setCustomAvatarPreview(null);

				setTimeout(() => setMessage(""), 3000);
			} else {
				setIsError(true);
				setMessage(data.error || "Erreur lors de l'upload");
				setTimeout(() => setMessage(""), 3000);
			}
		} catch (error) {
			setIsError(true);
			setMessage("Erreur réseau lors de l'upload");
			setTimeout(() => setMessage(""), 3000);
		} finally {
			setUploadingAvatar(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (customAvatar) {
			await handleUploadCustomAvatar();
			return;
		}

		const body: any = {};

		if (email && email !== user?.email) {
			if (!validateEmail(email)) {
				setIsError(true);
				setMessage("Email invalide.");
				setTimeout(() => setMessage(""), 3000);
				return;
			}
			body.email = email;
		}

		if (displayName && displayName !== user?.display_name) {
			if (!validateDisplayName(displayName)) {
				setIsError(true);
				setMessage(
					"Le pseudo ne doit contenir que des lettres, chiffres ou tirets."
				);
				setTimeout(() => setMessage(""), 3000);
				return;
			}
			body.display_name = displayName;
		}

		if (password) {
			if (!validatePassword(password)) {
				setIsError(true);
				setMessage(
					"Le mot de passe doit contenir au moins 6 caracteres, une majuscule, une minuscule, un chiffre et un caractere special."
				);
				setTimeout(() => setMessage(""), 3000);
				return;
			}
			body.password = password;
		}

		const finalAvatar = selectedAvatar || avatar;
		if (finalAvatar && finalAvatar !== user?.avatar) {
			body.avatar = finalAvatar;
		}

		if (Object.keys(body).length === 0) {
			setIsError(true);
			setMessage("Aucune modification detectee.");
			setTimeout(() => setMessage(""), 3000);
			return;
		}

		if (!token) {
			navigate("/Connection");
			return;
		}

		try {
			const res = await fetch(`${API_BASE_URL}/api/me`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(body),
			});

			const data = await res.json();
			if (res.ok) {
				setIsError(false);
				setMessage("Profil mis à jour avec succes");
				setPassword("");
				setEditMode(false);
				await refreshUser();
				setTimeout(() => setMessage(""), 3000);
			} else {
				setIsError(true);
				setMessage(data.error || t("errors.unknown"));
				setTimeout(() => setMessage(""), 3000);
			}
		} catch {
			setIsError(true);
			setMessage(t("errors.network"));
			setTimeout(() => setMessage(""), 3000);
		}
	};

	if (!user) {
		return (
			<>
				<SpaceBackground />
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-center">
						<div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
						<p className="text-gray-400">
							{t("profile.error_msg.loading")}
						</p>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<SpaceBackground />
			<ConfirmModal
				isOpen={confirmModal.isOpen}
				onClose={() =>
					setConfirmModal({ ...confirmModal, isOpen: false })
				}
				onConfirm={confirmModal.onConfirm}
				title={confirmModal.title}
				message={confirmModal.message}
				type={confirmModal.type}
			/>
			<div
				className={`relative min-h-screen overflow-hidden transition-opacity duration-700 ${
					isLoaded ? "opacity-100" : "opacity-0"
				}`}
			>
				<div className="max-w-7xl mx-auto px-6 py-8">
					<div className="bg-gradient-to-r from-slate-800/80 via-purple-900/80 to-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/20 p-8 mb-8 shadow-2xl">
						<div className="flex flex-col md:flex-row items-center gap-8">
							<div className="relative">
								<div className="absolute -inset-2 bg-gradient-to-r from-cyan-400/20 via-purple-400/20 to-pink-400/20 rounded-full blur-xl animate-pulse"></div>
								<img
									src={user.avatar || "/avatars/avatar1.png"}
									alt="Avatar"
									className="relative w-32 h-32 rounded-full border-4 border-purple-500/50 object-cover shadow-2xl"
								/>
								<div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-slate-800 flex items-center justify-center">
									<div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
								</div>
							</div>

							<div className="flex-1 text-center md:text-left">
								<h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 mb-2">
									{user.display_name}
								</h1>
								<p className="text-xl text-gray-400 mb-4">
									{user.email}
								</p>
								<div className="flex flex-wrap gap-4 justify-center md:justify-start">
									<div className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border border-emerald-500/30 rounded-lg px-4 py-2">
										<span className="text-emerald-300 font-semibold">
											{stats.winRate}% WR
										</span>
									</div>
								</div>
							</div>

							<button
								onClick={() => navigate("/")}
								className="group relative overflow-hidden rounded-lg px-6 py-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105"
							>
								<div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-cyan-600/0 group-hover:from-blue-600/20 group-hover:to-cyan-600/20 transition-all duration-300"></div>
								<span className="relative text-blue-300 group-hover:text-blue-200 font-semibold transition-colors duration-300 flex items-center gap-2">
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
											d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
										/>
									</svg>
									{t("profile.navigate.back")}
								</span>
							</button>
						</div>
					</div>

					<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 mb-8 shadow-2xl">
						<div className="flex flex-wrap">
							<button
								onClick={() => setActiveTab("overview")}
								className={`flex-1 min-w-0 px-6 py-4 font-semibold transition-all duration-300 rounded-xl m-2 ${
									activeTab === "overview"
										? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/50 text-purple-200"
										: "text-gray-400 hover:text-gray-200 hover:bg-slate-700/50"
								}`}
							>
								<span className="mr-2 inline-flex">
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
											d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
										/>
									</svg>
								</span>
								{t("profile.navigate.overview")}
							</button>

							<button
								onClick={() => setActiveTab("stats")}
								className={`flex-1 min-w-0 px-6 py-4 font-semibold transition-all duration-300 rounded-xl m-2 ${
									activeTab === "stats"
										? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/50 text-purple-200"
										: "text-gray-400 hover:text-gray-200 hover:bg-slate-700/50"
								}`}
							>
								<span className="mr-2 inline-flex">
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
											d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
										/>
									</svg>
								</span>
								{t("profile.navigate.stats")}
							</button>

							<button
								onClick={() => setActiveTab("history")}
								className={`flex-1 min-w-0 px-6 py-4 font-semibold transition-all duration-300 rounded-xl m-2 ${
									activeTab === "history"
										? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/50 text-purple-200"
										: "text-gray-400 hover:text-gray-200 hover:bg-slate-700/50"
								}`}
							>
								<span className="mr-2 inline-flex">
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
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</span>
								{t("profile.navigate.history")}
							</button>

							<button
								onClick={() => setActiveTab("friends")}
								className={`flex-1 min-w-0 px-6 py-4 font-semibold transition-all duration-300 rounded-xl m-2 ${
									activeTab === "friends"
										? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/50 text-purple-200"
										: "text-gray-400 hover:text-gray-200 hover:bg-slate-700/50"
								}`}
							>
								<span className="mr-2 inline-flex">
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
											d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
										/>
									</svg>
								</span>
								{t("profile.navigate.friends")}
							</button>

							<button
								onClick={() => setActiveTab("settings")}
								className={`flex-1 min-w-0 px-6 py-4 font-semibold transition-all duration-300 rounded-xl m-2 ${
									activeTab === "settings"
										? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/50 text-purple-200"
										: "text-gray-400 hover:text-gray-200 hover:bg-slate-700/50"
								}`}
							>
								<span className="mr-2 inline-flex">
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
											d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
										/>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
								</span>
								{t("profile.navigate.settings")}
							</button>
						</div>
					</div>

					<div className="space-y-8">
						{activeTab === "overview" && (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
								<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
									<h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-6 flex items-center gap-2">
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
												d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
											/>
										</svg>
										{t("profile.view.quickStats")}
									</h3>
									<div className="grid grid-cols-2 gap-4">
										<div className="text-center p-4 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-lg border border-blue-500/30">
											<div className="text-3xl font-bold text-blue-300">
												{stats.totalGames}
											</div>
											<div className="text-gray-400">
												{t("profile.view.gamesPlayed")}
											</div>
										</div>
										<div className="text-center p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-lg border border-green-500/30">
											<div className="text-3xl font-bold text-green-300">
												{stats.wins}
											</div>
											<div className="text-gray-400">
												{t("profile.view.wins")}
											</div>
										</div>
										<div className="text-center p-4 bg-gradient-to-r from-red-600/20 to-pink-600/20 rounded-lg border border-red-500/30">
											<div className="text-3xl font-bold text-red-300">
												{stats.losses}
											</div>
											<div className="text-gray-400">
												{t("profile.view.losses")}
											</div>
										</div>
										<div className="text-center p-4 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-lg border border-yellow-500/30">
											<div className="text-3xl font-bold text-yellow-300">
												{stats.winRate}%
											</div>
											<div className="text-gray-400">
												{t("profile.view.winRate")}
											</div>
										</div>
									</div>
								</div>

								<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
									<h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6 flex items-center gap-2">
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
												d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
											/>
										</svg>
										{t("profile.view.onlineFriends")}
									</h3>
									<div className="space-y-3">
										{friends
											.filter((f) => isOnline(f.online))
											.slice(0, 4)
											.map((friend) => (
												<div
													key={friend.id}
													className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600/30"
												>
													<div className="relative">
														<img
															src={
																friend.avatar ||
																"/avatars/avatar1.png"
															}
															alt={
																friend.display_name
															}
															className="w-10 h-10 rounded-full"
														/>
														<div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800"></div>
													</div>
													<div className="flex-1">
														<div className="text-white font-medium">
															{
																friend.display_name
															}
														</div>
														<div className="text-green-400 text-sm">
															{t(
																"profile.view.online"
															)}
														</div>
													</div>
												</div>
											))}
										{friends.filter((f) =>
											isOnline(f.online)
										).length === 0 && (
											<div className="text-center py-8 text-gray-400">
												<svg
													className="w-16 h-16 mx-auto mb-2 text-gray-500"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
													/>
												</svg>
												<p>
													{t(
														"profile.view.noOnlineFriends"
													)}
												</p>
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						{activeTab === "stats" && (
							<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
								<h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-8 flex items-center gap-2">
									<svg
										className="w-8 h-8"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
										/>
									</svg>
									{t("profile.stats.detailedStats")}
								</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
									<div className="text-center p-6 bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-xl border border-slate-500/30">
										<svg
											className="w-10 h-10 mx-auto mb-2 text-blue-400"
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
										<div className="text-3xl font-bold text-white mb-1">
											{stats.totalGames}
										</div>
										<div className="text-gray-400 text-sm">
											{t("profile.stats.totalGames")}
										</div>
									</div>
									<div className="text-center p-6 bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-xl border border-slate-500/30">
										<svg
											className="w-10 h-10 mx-auto mb-2 text-green-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
											/>
										</svg>
										<div className="text-3xl font-bold text-white mb-1">
											{stats.winRate}%
										</div>
										<div className="text-gray-400 text-sm">
											{t("profile.stats.winRate")}
										</div>
									</div>
									<div className="text-center p-6 bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-xl border border-slate-500/30">
										<svg
											className="w-10 h-10 mx-auto mb-2 text-purple-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
											/>
										</svg>
										<div className="text-3xl font-bold text-white mb-1">
											{stats.botWins}
										</div>
										<div className="text-gray-400 text-sm">
											{t("profile.stats.botWins")}
										</div>
									</div>
									<div className="text-center p-6 bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-xl border border-slate-500/30">
										<svg
											className="w-10 h-10 mx-auto mb-2 text-yellow-400"
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
										<div className="text-3xl font-bold text-white mb-1">
											{stats.playerWins}
										</div>
										<div className="text-gray-400 text-sm">
											{t("profile.stats.playerWins")}
										</div>
									</div>
									<div className="text-center p-6 bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-xl border border-slate-500/30">
										<svg
											className="w-10 h-10 mx-auto mb-2 text-orange-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
											/>
										</svg>
										<div className="text-3xl font-bold text-white mb-1">
											{stats.tournamentsWon}
										</div>
										<div className="text-gray-400 text-sm">
											{t("profile.stats.tournamentsWon")}
										</div>
									</div>
								</div>
							</div>
						)}

						{activeTab === "history" && (
							<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
								<h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-8 flex items-center gap-2">
									<svg
										className="w-8 h-8"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									{t("profile.history.matchHistory")}
								</h3>

								<div className="space-y-4">
									{matchHistory.length > 0 ? (
										<>
											{matchHistory.map((match) => (
												<div
													key={match.id}
													className={`p-6 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
														match.isWinner
															? "bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30 hover:border-green-400/50"
															: "bg-gradient-to-r from-red-600/20 to-pink-600/20 border-red-500/30 hover:border-red-400/50"
													}`}
												>
													<div className="flex items-center justify-between">
														<div className="flex items-center gap-4">
															<div className="relative">
																{match.opponent
																	.isBot ? (
																	<div className="w-16 h-16 rounded-full border-2 border-slate-600 bg-gradient-to-br from-orange-600/20 to-red-600/20 flex items-center justify-center">
																		<svg
																			className="w-8 h-8 text-orange-400"
																			fill="none"
																			stroke="currentColor"
																			viewBox="0 0 24 24"
																		>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				strokeWidth={
																					2
																				}
																				d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
																			/>
																		</svg>
																	</div>
																) : (
																	<img
																		src={
																			match
																				.opponent
																				.avatar ||
																			"/avatars/avatar1.png"
																		}
																		alt={
																			match
																				.opponent
																				.name
																		}
																		className="w-16 h-16 rounded-full border-2 border-slate-600 object-cover"
																	/>
																)}
															</div>

															<div className="flex-1">
																<div className="flex items-center gap-2 mb-1">
																	{match.isWinner ? (
																		<svg
																			className="w-6 h-6 text-green-400"
																			fill="none"
																			stroke="currentColor"
																			viewBox="0 0 24 24"
																		>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				strokeWidth={
																					2
																				}
																				d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
																			/>
																		</svg>
																	) : (
																		<svg
																			className="w-6 h-6 text-red-400"
																			fill="none"
																			stroke="currentColor"
																			viewBox="0 0 24 24"
																		>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				strokeWidth={
																					2
																				}
																				d="M6 18L18 6M6 6l12 12"
																			/>
																		</svg>
																	)}
																	<span
																		className={`font-bold text-lg ${
																			match.isWinner
																				? "text-green-300"
																				: "text-red-300"
																		}`}
																	>
																		{match.isWinner
																			? t(
																					"profile.history.victory"
																			  )
																			: t(
																					"profile.history.defeat"
																			  )}
																	</span>
																</div>

																<div className="flex items-center gap-2 text-gray-300">
																	<span className="text-white font-medium">
																		{t(
																			"profile.history.vs"
																		)}{" "}
																		{
																			match
																				.opponent
																				.name
																		}
																	</span>
																	{match
																		.opponent
																		.isBot && (
																		<span className="px-2 py-1 bg-orange-600/20 text-orange-300 rounded-md text-xs border border-orange-500/30">
																			{t(
																				"profile.history.bot"
																			)}
																		</span>
																	)}
																	{match.matchType ===
																		"tournament" && (
																		<span className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded-md text-xs border border-purple-500/30 flex items-center gap-1">
																			<svg
																				className="w-3 h-3"
																				fill="none"
																				stroke="currentColor"
																				viewBox="0 0 24 24"
																			>
																				<path
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					strokeWidth={
																						2
																					}
																					d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
																				/>
																			</svg>
																			{t(
																				"profile.history.tournament"
																			)}
																		</span>
																	)}
																	{match.matchType ===
																		"quick" &&
																		!match
																			.opponent
																			.isBot && (
																			<span className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded-md text-xs border border-blue-500/30 flex items-center gap-1">
																				<svg
																					className="w-3 h-3"
																					fill="none"
																					stroke="currentColor"
																					viewBox="0 0 24 24"
																				>
																					<path
																						strokeLinecap="round"
																						strokeLinejoin="round"
																						strokeWidth={
																							2
																						}
																						d="M13 10V3L4 14h7v7l9-11h-7z"
																					/>
																				</svg>
																				{t(
																					"profile.history.quick"
																				)}
																			</span>
																		)}
																	{match.matchType ===
																		"offline" &&
																		match
																			.opponent
																			.isBot && (
																			<span className="px-2 py-1 bg-green-600/20 text-green-300 rounded-md text-xs border border-green-500/30 flex items-center gap-1">
																				<svg
																					className="w-3 h-3"
																					fill="none"
																					stroke="currentColor"
																					viewBox="0 0 24 24"
																				>
																					<path
																						strokeLinecap="round"
																						strokeLinejoin="round"
																						strokeWidth={
																							2
																						}
																						d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
																					/>
																				</svg>
																				{t(
																					"profile.history.training"
																				)}
																			</span>
																		)}
																</div>

																<div className="text-sm text-gray-400 mt-1">
																	{formatDate(
																		match.date
																	)}
																</div>
															</div>
														</div>

														<div className="text-right">
															{match.scores && (
																<div
																	className={`text-2xl font-bold mb-2 ${
																		match.isWinner
																			? "text-green-300"
																			: "text-red-300"
																	}`}
																>
																	{
																		match
																			.scores[0]
																	}{" "}
																	-{" "}
																	{
																		match
																			.scores[1]
																	}
																</div>
															)}
															<div className="flex items-center gap-2">
																<span className="text-gray-400 text-sm">
																	{t(
																		"profile.history.matchNumber"
																	)}{" "}
																	{match.id}
																</span>
															</div>
														</div>
													</div>
												</div>
											))}

											{hasMoreHistory && (
												<div className="flex justify-center mt-8">
													<button
														onClick={
															loadMoreHistory
														}
														disabled={
															historyLoading
														}
														className="px-6 py-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-300 rounded-lg border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
													>
														{historyLoading ? (
															<span className="flex items-center gap-2">
																<div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
																{t(
																	"profile.history.loading"
																)}
															</span>
														) : (
															<span className="flex items-center gap-2">
																<svg
																	className="w-5 h-5"
																	fill="none"
																	stroke="currentColor"
																	viewBox="0 0 24 24"
																>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		strokeWidth={
																			2
																		}
																		d="M19 9l-7 7-7-7"
																	/>
																</svg>
																{t(
																	"profile.history.loadMore"
																)}
															</span>
														)}
													</button>
												</div>
											)}
										</>
									) : (
										<div className="text-center py-16 text-gray-400">
											<svg
												className="w-32 h-32 mx-auto mb-6 text-gray-500"
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
											<h4 className="text-2xl font-bold text-gray-300 mb-2">
												{t(
													"profile.history.noGamesPlayed"
												)}
											</h4>
											<p className="text-lg mb-4">
												{t(
													"profile.history.historyPlaceholder"
												)}
											</p>
											<button
												onClick={() =>
													navigate("/pong")
												}
												className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
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
														d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
													/>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
												{t(
													"profile.history.playFirstGame"
												)}
											</button>
										</div>
									)}
								</div>
							</div>
						)}

						{activeTab === "friends" && (
							<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
								<h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-8 flex items-center gap-2">
									<svg
										className="w-8 h-8"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
										/>
									</svg>
									{t("profile.friend.manage")}
								</h3>

								{friendsError && (
									<div className="mb-6 p-4 rounded-lg border bg-red-500/10 border-red-500/30 text-red-400">
										<div className="flex justify-between items-center">
											<span>{friendsError}</span>
											<button
												onClick={() =>
													setFriendsError(null)
												}
												className="text-red-300 hover:text-red-200"
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
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										</div>
									</div>
								)}

								<div className="flex flex-wrap gap-2 mb-8">
									{[
										{
											id: "list",
											label: `${t(
												"profile.friend.friends"
											)} (${friends.length})`,
											icon: "👥",
										},
										{
											id: "requests",
											label: `${t(
												"profile.friend.requests"
											)} (${requests.length})`,
											icon: "📩",
										},
										{
											id: "blocked",
											label: `${t(
												"profile.friend.blocked"
											)} (${blockedUsers.length})`,
											icon: "🚫",
										},
									].map((tab) => (
										<button
											key={tab.id}
											onClick={() =>
												setFriendsSubTab(tab.id as any)
											}
											className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
												friendsSubTab === tab.id
													? "bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-500/50 text-blue-200"
													: "text-gray-400 hover:text-gray-200 hover:bg-slate-700/50"
											}`}
										>
											<span className="mr-2">
												{tab.icon}
											</span>
											{tab.label}
										</button>
									))}
								</div>

								{friendsSubTab === "list" && (
									<div className="space-y-6">
										<div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
											<h4 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-4">
												➕ {t("profile.friend.add")}
											</h4>
											<div className="flex gap-3">
												<input
													value={newFriendName}
													onChange={(e) =>
														setNewFriendName(
															e.target.value
														)
													}
													onKeyPress={handleKeyPress}
													placeholder={t(
														"profile.friend.usernamePlaceholder"
													)}
													className="flex-1 px-4 py-3 bg-slate-600/50 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
													disabled={friendsLoading}
												/>
												<button
													onClick={handleAddFriend}
													disabled={
														friendsLoading ||
														!newFriendName.trim()
													}
													className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
												>
													{friendsLoading
														? "⏳"
														: "📤"}
												</button>
											</div>
											<p className="text-sm text-gray-400 mt-2">
												{t("profile.friend.addHint")}
											</p>
										</div>

										<div className="space-y-4">
											{friends.length > 0 ? (
												friends.map((friend) => (
													<div
														key={friend.id}
														className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300"
													>
														<div className="flex items-center gap-4">
															<div className="relative">
																<img
																	src={
																		friend.avatar ||
																		"/avatars/avatar1.png"
																	}
																	alt={
																		friend.display_name
																	}
																	className="w-16 h-16 rounded-full border-2 border-slate-600 object-cover"
																/>
																<div
																	className={`absolute -bottom-1 -right-1 w-5 h-5 ${
																		isOnline(
																			friend.online
																		)
																			? "bg-green-500"
																			: "bg-gray-500"
																	} rounded-full border-2 border-slate-800`}
																></div>
															</div>
															<div className="flex-1">
																<h4 className="text-lg font-bold text-white">
																	{
																		friend.display_name
																	}
																</h4>
																<p
																	className={`text-sm ${
																		isOnline(
																			friend.online
																		)
																			? "text-green-400"
																			: "text-gray-500"
																	}`}
																>
																	{isOnline(
																		friend.online
																	)
																		? `🟢 ${t(
																				"profile.friend.online"
																		  )}`
																		: `⚫ ${t(
																				"profile.friend.offline"
																		  )}`}
																</p>
															</div>
															<div className="flex gap-2">
																{isOnline(
																	friend.online
																) && (
																	<button
																		onClick={() => {
																			if (
																				pongWsRef
																					.current
																					?.readyState ===
																				WebSocket.OPEN
																			) {
																				pongWsRef.current.send(
																					JSON.stringify(
																						{
																							event: "invitation",
																							body: {
																								action: "invite",
																								friendId:
																									friend.id,
																								options:
																									{
																										bonus: bonusEnabled,
																									},
																							},
																						}
																					)
																				);
																			}
																		}}
																		className="px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-300 rounded-lg border border-purple-500/30 hover:border-purple-400/50 transition-all duration-200 font-medium"
																	>
																		{t(
																			"profile.friend.invite"
																		)}
																	</button>
																)}
																<button
																	onClick={() =>
																		handleBlockUser(
																			friend.id
																		)
																	}
																	className="px-4 py-2 bg-orange-600/20 text-orange-300 rounded-lg border border-orange-500/30 hover:border-orange-400/50 transition-all duration-200 font-medium"
																>
																	{t(
																		"profile.friend.block"
																	)}
																</button>
																<button
																	onClick={() =>
																		handleRemoveFriend(
																			friend.id
																		)
																	}
																	className="px-4 py-2 bg-red-600/20 text-red-300 rounded-lg border border-red-500/30 hover:border-red-400/50 transition-all duration-200 font-medium"
																>
																	{t(
																		"profile.friend.remove"
																	)}
																</button>
															</div>
														</div>
													</div>
												))
											) : (
												<div className="text-center py-12 text-gray-400">
													<div className="text-6xl mb-4">
														👻
													</div>
													<p className="text-lg">
														{t(
															"profile.friend.notFound"
														)}
													</p>
													<p className="text-sm">
														{t(
															"profile.friend.searchPlaceholder"
														)}
													</p>
												</div>
											)}
										</div>
									</div>
								)}

								{friendsSubTab === "requests" && (
									<div className="space-y-6">
										<div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
											<h4 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-4">
												📥{" "}
												{t(
													"profile.friend.receivedRequests"
												)}{" "}
												(
												{
													requests.filter(
														(r) =>
															r.type ===
															"received"
													).length
												}
												)
											</h4>
											<div className="space-y-3">
												{requests.filter(
													(r) => r.type === "received"
												).length > 0 ? (
													requests
														.filter(
															(r) =>
																r.type ===
																"received"
														)
														.map((r) => (
															<div
																key={
																	r.sender_id
																}
																className="flex items-center justify-between p-4 bg-slate-600/50 rounded-lg border border-slate-500/30"
															>
																<div className="flex items-center gap-3">
																	<img
																		src={
																			r.avatar ||
																			"/avatars/avatar1.png"
																		}
																		alt={
																			r.display_name
																		}
																		className="w-12 h-12 rounded-full object-cover border-2 border-slate-500"
																	/>
																	<span className="font-medium text-white">
																		{
																			r.display_name
																		}
																	</span>
																</div>
																<div className="flex gap-2">
																	<button
																		onClick={() =>
																			handleAcceptRequest(
																				r.sender_id
																			)
																		}
																		className="px-3 py-2 bg-green-600/20 text-green-300 rounded-lg border border-green-500/30 hover:border-green-400/50 transition-all duration-200 font-medium"
																	>
																		{t(
																			"profile.friend.accept"
																		)}
																	</button>
																	<button
																		onClick={() =>
																			handleRejectRequest(
																				r.sender_id
																			)
																		}
																		className="px-3 py-2 bg-gray-600/20 text-gray-300 rounded-lg border border-gray-500/30 hover:border-gray-400/50 transition-all duration-200 font-medium"
																	>
																		{t(
																			"profile.friend.reject"
																		)}
																	</button>
																	<button
																		onClick={() =>
																			handleBlockUser(
																				r.sender_id
																			)
																		}
																		className="px-3 py-2 bg-red-600/20 text-red-300 rounded-lg border border-red-500/30 hover:border-red-400/50 transition-all duration-200 font-medium"
																	>
																		{t(
																			"profile.friend.block"
																		)}
																	</button>
																</div>
															</div>
														))
												) : (
													<div className="text-center py-8 text-gray-400">
														<div className="text-4xl mb-2">
															📪
														</div>
														<p>
															{t(
																"profile.friend.noReceivedRequests"
															)}
														</p>
													</div>
												)}
											</div>
										</div>

										<div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
											<h4 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-4">
												📤{" "}
												{t(
													"profile.friend.sentRequests"
												)}{" "}
												(
												{
													requests.filter(
														(r) => r.type === "sent"
													).length
												}
												)
											</h4>
											<div className="space-y-3">
												{requests.filter(
													(r) => r.type === "sent"
												).length > 0 ? (
													requests
														.filter(
															(r) =>
																r.type ===
																"sent"
														)
														.map((r) => (
															<div
																key={
																	r.sender_id
																}
																className="flex items-center justify-between p-4 bg-slate-600/50 rounded-lg border border-slate-500/30"
															>
																<div className="flex items-center gap-3">
																	<img
																		src={
																			r.avatar ||
																			"/avatars/avatar1.png"
																		}
																		alt={
																			r.display_name
																		}
																		className="w-12 h-12 rounded-full object-cover border-2 border-slate-500"
																	/>
																	<span className="font-medium text-white">
																		{
																			r.display_name
																		}
																	</span>
																</div>
																<span className="text-yellow-400 font-medium flex items-center gap-2">
																	<div className="animate-pulse w-2 h-2 bg-yellow-400 rounded-full"></div>
																	{t(
																		"profile.friend.pending"
																	)}
																</span>
															</div>
														))
												) : (
													<div className="text-center py-8 text-gray-400">
														<div className="text-4xl mb-2">
															📭
														</div>
														<p>
															{t(
																"profile.friend.noSentRequests"
															)}
														</p>
													</div>
												)}
											</div>
										</div>
									</div>
								)}

								{friendsSubTab === "blocked" && (
									<div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
										<h4 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400 mb-4">
											🚫{" "}
											{t("profile.friend.blockedUsers")} (
											{blockedUsers.length})
										</h4>
										<div className="space-y-3">
											{blockedUsers.length > 0 ? (
												blockedUsers.map((u) => (
													<div
														key={u.id}
														className="flex items-center justify-between p-4 bg-slate-600/50 rounded-lg border border-slate-500/30"
													>
														<div className="flex items-center gap-3">
															<img
																src={
																	u.avatar ||
																	"/avatars/avatar1.png"
																}
																alt={
																	u.display_name
																}
																className="w-12 h-12 rounded-full object-cover border-2 border-slate-500 opacity-50"
															/>
															<div>
																<span className="font-medium text-white">
																	{
																		u.display_name
																	}
																</span>
																<div className="text-sm text-gray-400">
																	{t(
																		"profile.friend.blockedOn"
																	)}{" "}
																	{new Date(
																		u.created_at
																	).toLocaleDateString()}
																</div>
															</div>
														</div>
														<button
															onClick={() =>
																handleUnblockUser(
																	u.id
																)
															}
															className="px-4 py-2 bg-blue-600/20 text-blue-300 rounded-lg border border-blue-500/30 hover:border-blue-400/50 transition-all duration-200 font-medium"
														>
															{t(
																"profile.friend.unblock"
															)}
														</button>
													</div>
												))
											) : (
												<div className="text-center py-8 text-gray-400">
													<div className="text-4xl mb-2">
														🕊️
													</div>
													<p>
														{t(
															"profile.friend.noBlockedUsers"
														)}
													</p>
													<p className="text-sm">
														{t(
															"profile.friend.peaceMessage"
														)}
													</p>
												</div>
											)}
										</div>
									</div>
								)}
							</div>
						)}

						{activeTab === "settings" && (
							<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-600/30 p-8 shadow-2xl">
								<div className="flex justify-between items-center mb-8">
									<h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-400">
										⚙️ {t("profile.settings.title")}
									</h3>
									<button
										onClick={() => setEditMode(!editMode)}
										className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
											editMode
												? "bg-red-600/20 text-red-300 border border-red-500/30 hover:border-red-400/50"
												: "bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:border-blue-400/50"
										}`}
									>
										{editMode
											? `❌ ${t(
													"profile.settings.cancel"
											  )}`
											: `✏️ ${t(
													"profile.settings.edit"
											  )}`}
									</button>
								</div>

								{message && (
									<div
										className={`mb-6 p-4 rounded-lg border ${
											isError
												? "bg-red-600/20 border-red-500/30 text-red-300"
												: "bg-green-600/20 border-green-500/30 text-green-300"
										}`}
									>
										{message}
									</div>
								)}

								{!editMode ? (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
										<div className="space-y-6">
											<div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
												<h4 className="text-lg font-bold text-gray-200 mb-4">
													{t(
														"profile.settings.personalInfo"
													)}
												</h4>
												<div className="space-y-3">
													<div>
														<span className="text-gray-400">
															{t(
																"profile.settings.email"
															)}{" "}
															:
														</span>
														<span className="text-white ml-2 font-medium">
															{user.email}
														</span>
													</div>
													<div>
														<span className="text-gray-400">
															{t(
																"profile.settings.username"
															)}{" "}
															:
														</span>
														<span className="text-white ml-2 font-medium">
															{user.display_name}
														</span>
													</div>
												</div>
											</div>
										</div>

										<div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/30">
											<h4 className="text-lg font-bold text-gray-200 mb-4">
												{t(
													"profile.settings.currentAvatar"
												)}
											</h4>
											<div className="flex justify-center">
												<img
													src={
														user.avatar ||
														"/avatars/avatar1.png"
													}
													alt={t(
														"profile.settings.currentAvatar"
													)}
													className="w-32 h-32 rounded-full border-4 border-purple-500/50 object-cover"
												/>
											</div>
										</div>
									</div>
								) : (
									<form
										onSubmit={handleSubmit}
										className="space-y-8"
									>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
											<div className="space-y-6">
												<div>
													<label className="block text-sm font-medium text-gray-300 mb-2">
														{t(
															"profile.settings.email"
														)}
													</label>
													<input
														type="email"
														value={email}
														onChange={(e) =>
															setEmail(
																e.target.value
															)
														}
														className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
														placeholder="votre@email.com"
													/>
												</div>

												<div>
													<label className="block text-sm font-medium text-gray-300 mb-2">
														{t(
															"profile.settings.username"
														)}
													</label>
													<input
														type="text"
														value={displayName}
														onChange={(e) =>
															setDisplayName(
																e.target.value
															)
														}
														className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
														placeholder={t(
															"profile.settings.username"
														)}
													/>
												</div>

												<div>
													<label className="block text-sm font-medium text-gray-300 mb-2">
														{t(
															"profile.settings.newPassword"
														)}
													</label>
													<input
														type="password"
														value={password}
														onChange={(e) =>
															setPassword(
																e.target.value
															)
														}
														className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
														placeholder="••••••••"
													/>
												</div>
												<div>
													<label className="block text-sm font-medium text-gray-300 mb-2">
														{t(
															"profile.settings.customAvatar"
														)}
													</label>
													<input
														type="file"
														accept="image/*"
														onChange={
															handleCustomAvatarChange
														}
														className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
													/>
													{customAvatarPreview && (
														<div className="mt-4 flex justify-center">
															<img
																src={
																	customAvatarPreview
																}
																alt="Custom Avatar Preview"
																className="w-32 h-32 rounded-full border-4 border-purple-500/50 object-cover"
															/>
														</div>
													)}
												</div>
											</div>

											<div>
												<label className="block text-sm font-medium text-gray-300 mb-4">
													{t(
														"profile.settings.chooseAvatar"
													)}
												</label>
												<div className="grid grid-cols-5 gap-3">
													{avatars.map(
														(avatarUrl) => (
															<button
																key={avatarUrl}
																type="button"
																onClick={() => {
																	setSelectedAvatar(
																		avatarUrl
																	);
																	setAvatar(
																		avatarUrl
																	);
																}}
																className={`relative rounded-full overflow-hidden transition-all duration-300 ${
																	selectedAvatar ===
																		avatarUrl ||
																	(!selectedAvatar &&
																		avatar ===
																			avatarUrl)
																		? "ring-4 ring-purple-500 scale-110"
																		: "hover:scale-105 opacity-70 hover:opacity-100"
																}`}
															>
																<img
																	src={
																		avatarUrl
																	}
																	alt="Avatar"
																	className="w-16 h-16 object-cover"
																/>
															</button>
														)
													)}
												</div>

												{uploadedCustomAvatar && (
													<div className="mt-4">
														<p className="text-sm font-medium text-gray-300 mb-2">
															📸 Avatar
															personnalisé
															disponible
														</p>
														<button
															type="button"
															onClick={() => {
																setSelectedAvatar(
																	uploadedCustomAvatar
																);
																setAvatar(
																	uploadedCustomAvatar
																);
															}}
															className={`relative rounded-full overflow-hidden transition-all duration-300 ${
																selectedAvatar ===
																uploadedCustomAvatar
																	? "ring-4 ring-green-500 scale-110"
																	: "hover:scale-105 opacity-70 hover:opacity-100"
															}`}
														>
															<img
																src={
																	uploadedCustomAvatar
																}
																alt="Avatar personnalisé"
																className="w-20 h-20 object-cover"
															/>
														</button>
													</div>
												)}

												<div className="mt-6 flex justify-center">
													<div className="text-center">
														<p className="text-gray-400 text-sm mb-2">
															{t(
																"profile.settings.preview"
															)}
														</p>
														<img
															src={
																selectedAvatar ||
																avatar
															}
															alt={t(
																"profile.settings.previewAvatar"
															)}
															className="w-24 h-24 rounded-full border-4 border-purple-500/50 object-cover mx-auto"
														/>
													</div>
												</div>
											</div>
										</div>

										<div className="flex gap-4 justify-center">
											<button
												type="submit"
												disabled={uploadingAvatar}
												className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{uploadingAvatar ? (
													<span className="flex items-center gap-2">
														<div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
														{t(
															"profile.settings.uploading"
														)}
													</span>
												) : customAvatar ? (
													<span>
														📤{" "}
														{t(
															"profile.settings.upload"
														)}
													</span>
												) : (
													<span>
														💾{" "}
														{t(
															"profile.settings.save"
														)}
													</span>
												)}
											</button>
											<button
												type="button"
												onClick={() =>
													setEditMode(false)
												}
												disabled={uploadingAvatar}
												className="px-8 py-3 bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-500 hover:to-slate-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
											>
												❌{" "}
												{t("profile.settings.cancel")}
											</button>
										</div>
									</form>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
