import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../contexts/UserContext";
import { useFriends } from "../contexts/FriendsContext";
import { useNavigate } from "react-router";
import { useWebSocket } from "../contexts/WebSocketContext";
import ConfirmModal from "../Components/ConfirmModal";

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

export default function Friends() {
	const { t } = useTranslation();
	const { user } = useUser();
	const navigate = useNavigate();
	const { friends, refreshFriends, isOnlineStatus, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, blockUser, unblockUser } = useFriends();
	const { friendsWsRef } = useWebSocket();
	const [requests, setRequests] = useState<FriendRequest[]>([]);
	const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
	const [newFriend, setNewFriend] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<
		"friends" | "requests" | "blocked"
	>("friends");

	const [confirmModal, setConfirmModal] = useState({
		isOpen: false,
		title: "",
		message: "",
		type: "warning" as "danger" | "warning" | "info",
		onConfirm: () => {},
	});

	const fetchRequestsWs = () => {
		if (friendsWsRef.current && friendsWsRef.current.readyState === WebSocket.OPEN) {
			friendsWsRef.current.send(JSON.stringify({ type: 'get_friend_requests' }));
		}
	};

	const fetchBlockedUsersWs = () => {
		if (friendsWsRef.current && friendsWsRef.current.readyState === WebSocket.OPEN) {
			friendsWsRef.current.send(JSON.stringify({ type: 'get_blocked_users' }));
		}
	};

	useEffect(() => {
		const handleRefreshRequests = () => {
			fetchRequestsWs();
		};

		const handleRefreshBlockedUsers = () => {
			fetchBlockedUsersWs();
		};

		const handleWsMessage = (event: CustomEvent) => {
			const data = event.detail;
			
			if (data.type === 'friend_requests_list') {
				if (data.data) {
					setRequests(data.data);
				}
			} else if (data.type === 'blocked_users_list') {
				if (data.data) {
					setBlockedUsers(data.data);
				}
			}
		};

		window.addEventListener("refreshFriendRequests", handleRefreshRequests);
		window.addEventListener("refreshBlockedUsers", handleRefreshBlockedUsers);
		window.addEventListener("friendsWebSocketMessage", handleWsMessage as EventListener);

		return () => {
			window.removeEventListener("refreshFriendRequests", handleRefreshRequests);
			window.removeEventListener("refreshBlockedUsers", handleRefreshBlockedUsers);
			window.removeEventListener("friendsWebSocketMessage", handleWsMessage as EventListener);
		};
	}, [friendsWsRef]);

	useEffect(() => {
		if (user?.id) {
			refreshFriends();
			fetchRequestsWs();
			fetchBlockedUsersWs();
		}
	}, [user?.id]);

	const sendRequest = async () => {
		if (!newFriend.trim()) return;
		setLoading(true);
		setError(null);
		
		try {
			const result = await sendFriendRequest(newFriend.trim());
			if (result.success) {
				setNewFriend("");
				fetchRequestsWs();
			} else {
				setError(result.error || t("errors.unknown"));
			}
		} catch (err) {
			setError(t("errors.network"));
		} finally {
			setLoading(false);
		}
	};

	const handleAcceptRequest = (senderId: number) => {
		acceptFriendRequest(senderId);
		setTimeout(() => fetchRequestsWs(), 500);
	};

	const handleRejectRequest = (senderId: number) => {
		rejectFriendRequest(senderId);
		setTimeout(() => fetchRequestsWs(), 500);
	};

	const handleRemoveFriend = (friendId: number) => {
		setConfirmModal({
			isOpen: true,
			title: "🗑️ Supprimer cet ami",
			message: t("friends.confirmDelete"),
			type: "danger",
			onConfirm: () => {
				removeFriend(friendId);
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
				blockUser(userId);
				setTimeout(() => {
					fetchRequestsWs();
					fetchBlockedUsersWs();
				}, 500);
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
				unblockUser(userId);
				setTimeout(() => fetchBlockedUsersWs(), 500);
				setConfirmModal({ ...confirmModal, isOpen: false });
			},
		});
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !loading) sendRequest();
	};

	return (
		<>
			<ConfirmModal
				isOpen={confirmModal.isOpen}
				onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
				onConfirm={confirmModal.onConfirm}
				title={confirmModal.title}
				message={confirmModal.message}
				type={confirmModal.type}
			/>
			<div className="flex max-w-4xl mx-auto mt-10 gap-6">
				<div className="flex-1 p-6 border rounded-lg shadow bg-white">
					<div className="mb-4">
						<button
							onClick={() => navigate("/dashboard")}
							className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
						>
							Retour au dashboard
						</button>
					</div>

					{error && (
						<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
							{error}
							<button
								onClick={() => setError(null)}
								className="ml-2 text-red-500"
							>
								×
							</button>
						</div>
					)}

					<div className="mb-6 border-b">
						<nav className="flex space-x-8">
							<button
								onClick={() => setActiveTab("friends")}
								className={`py-2 px-1 border-b-2 font-medium text-sm ${
									activeTab === "friends"
										? "border-blue-500 text-blue-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Amis ({friends.length})
							</button>
							<button
								onClick={() => setActiveTab("requests")}
								className={`py-2 px-1 border-b-2 font-medium text-sm ${
									activeTab === "requests"
										? "border-blue-500 text-blue-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Demandes ({requests.length})
							</button>
							<button
								onClick={() => setActiveTab("blocked")}
								className={`py-2 px-1 border-b-2 font-medium text-sm ${
									activeTab === "blocked"
										? "border-blue-500 text-blue-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Bloques ({blockedUsers.length})
							</button>
						</nav>
					</div>

					{activeTab === "friends" && (
						<div>
							<h2 className="text-2xl font-bold mb-4">
								Mes amis ({friends.length})
							</h2>
							<div className="space-y-2 mb-6">
								{friends.length > 0 ? (
									friends.map((f) => (
										<div
											key={f.id}
											className="flex justify-between items-center p-3 border-b hover:bg-gray-50"
										>
											<div className="flex items-center gap-3">
												{f.avatar && (
													<img
														src={f.avatar}
														alt={f.display_name}
														className="w-8 h-8 rounded-full object-cover"
													/>
												)}
												<div>
													<span className="font-medium">
														{f.display_name}
													</span>
													<div
														className={`text-sm ${
															isOnlineStatus(f.online)
																? "text-green-600"
																: "text-gray-500"
														}`}
													>
														{isOnlineStatus(f.online)
															? `🟢 ${t(
																	"common.online"
															  )}`
															: `⚫ ${t(
																	"common.offline"
															  )}`}
													</div>
												</div>
											</div>
											<div className="space-x-2">
												<button
													onClick={() => handleBlockUser(f.id)}
													className="bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors"
												>
													{t("common.block")}
												</button>
												<button
													onClick={() => handleRemoveFriend(f.id)}
													className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
												>
													{t("friends.deleteButton")}
												</button>
											</div>
										</div>
									))
								) : (
									<p className="text-gray-500 italic">
										Aucun ami pour l'instant
									</p>
								)}
							</div>

							<h3 className="text-xl font-bold mb-4">
								Ajouter un ami
							</h3>
							<div className="flex gap-2">
								<input
									value={newFriend}
									onChange={(e) => setNewFriend(e.target.value)}
									onKeyPress={handleKeyPress}
									placeholder="Nom d'utilisateur"
									className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
									disabled={loading}
								/>
								<button
									onClick={sendRequest}
									disabled={loading || !newFriend.trim()}
									className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loading
										? t("common.sending")
										: t("common.send")}
								</button>
							</div>
							<p className="text-sm text-gray-600 mt-2">
								Entrez le nom d'utilisateur exact de la personne que
								vous souhaitez ajouter.
							</p>
						</div>
					)}

					{activeTab === "requests" && (
						<div>
							<h3 className="text-xl font-bold mb-4">
								Demandes reçues (
								{
									requests.filter((r) => r.type === "received")
										.length
								}
								)
							</h3>
							<div className="space-y-2 mb-6">
								{requests.filter((r) => r.type === "received")
									.length > 0 ? (
									requests
										.filter((r) => r.type === "received")
										.map((r) => (
											<div
												key={r.sender_id}
												className="flex justify-between items-center p-3 border-b hover:bg-gray-50"
											>
												<div className="flex items-center gap-3">
													{r.avatar && (
														<img
															src={r.avatar}
															alt={r.display_name}
															className="w-8 h-8 rounded-full object-cover"
														/>
													)}
													<span className="font-medium">
														{r.display_name}
													</span>
												</div>
												<div className="space-x-2">
													<button
														onClick={() => handleAcceptRequest(r.sender_id)}
														className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
													>
														Accepter
													</button>
													<button
														onClick={() => handleRejectRequest(r.sender_id)}
														className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
													>
														Refuser
													</button>
													<button
														onClick={() => handleBlockUser(r.sender_id)}
														className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
													>
														{t("common.block")}
													</button>
												</div>
											</div>
										))
								) : (
									<p className="text-gray-500 italic">
										Aucune demande reçue
									</p>
								)}
							</div>

							<h3 className="text-xl font-bold mb-4">
								Demandes envoyees (
								{requests.filter((r) => r.type === "sent").length})
							</h3>
							<div className="space-y-2">
								{requests.filter((r) => r.type === "sent").length >
								0 ? (
									requests
										.filter((r) => r.type === "sent")
										.map((r) => (
											<div
												key={r.sender_id}
												className="flex justify-between items-center p-3 border-b hover:bg-gray-50"
											>
												<div className="flex items-center gap-3">
													{r.avatar && (
														<img
															src={r.avatar}
															alt={r.display_name}
															className="w-8 h-8 rounded-full object-cover"
														/>
													)}
													<span className="font-medium">
														{r.display_name}
													</span>
												</div>
												<span className="text-yellow-600 font-medium">
													En attente...
												</span>
											</div>
										))
								) : (
									<p className="text-gray-500 italic">
										Aucune demande envoyee
									</p>
								)}
							</div>
						</div>
					)}

					{activeTab === "blocked" && (
						<div>
							<h2 className="text-2xl font-bold mb-4">
								Utilisateurs bloques ({blockedUsers.length})
							</h2>
							<div className="space-y-2">
								{blockedUsers.length > 0 ? (
									blockedUsers.map((u) => (
										<div
											key={u.id}
											className="flex justify-between items-center p-3 border-b hover:bg-gray-50"
										>
											<div className="flex items-center gap-3">
												{u.avatar && (
													<img
														src={u.avatar}
														alt={u.display_name}
														className="w-8 h-8 rounded-full object-cover"
													/>
												)}
												<div>
													<span className="font-medium">
														{u.display_name}
													</span>
													<div className="text-sm text-gray-500">
														Bloque le{" "}
														{new Date(
															u.created_at
														).toLocaleDateString()}
													</div>
												</div>
											</div>
											<button
												onClick={() => handleUnblockUser(u.id)}
												className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
											>
												{t("common.unblock")}
											</button>
										</div>
									))
								) : (
									<p className="text-gray-500 italic">
										Aucun utilisateur bloque
									</p>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
