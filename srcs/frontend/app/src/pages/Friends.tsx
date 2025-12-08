import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../contexts/UserContext";
import { useNavigate } from "react-router";
import { API_BASE_URL, WS_BASE_URL } from "../config/api";

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

export default function Friends() {
	const { t } = useTranslation();
	const { user } = useUser();
	const token = sessionStorage.getItem("token") || undefined;
	const navigate = useNavigate();
	const [friends, setFriends] = useState<Friend[]>([]);
	const [requests, setRequests] = useState<FriendRequest[]>([]);
	const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
	const [newFriend, setNewFriend] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<
		"friends" | "requests" | "blocked"
	>("friends");
	const [wsStatus, setWsStatus] = useState<string>("Deconnecte");
	const wsRef = useRef<WebSocket | null>(null);

	const fetchFriends = async () => {
		try {
			const res = await fetch(`${API_BASE_URL}/api/friends`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const data = await res.json();
				setFriends(data);
			}
		} catch (err) {
			console.error("Erreur lors du chargement des amis:", err);
		}
	};

	const fetchRequests = async () => {
		try {
			const res = await fetch(`${API_BASE_URL}/api/friend-requests`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const data = await res.json();
				setRequests(data);
			}
		} catch (err) {
			console.error("Erreur lors du chargement des demandes:", err);
		}
	};

	const fetchBlockedUsers = async () => {
		try {
			const res = await fetch(`${API_BASE_URL}/api/blocked-users`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const data = await res.json();
				setBlockedUsers(data);
			}
		} catch (err) {
			console.error(
				"Erreur lors du chargement des utilisateurs bloques:",
				err
			);
		}
	};

	useEffect(() => {
		if (!token || !user?.id) return;

		const ws = new WebSocket(`${WS_BASE_URL}/ws-friends?token=${token}`);
		wsRef.current = ws;

		ws.onopen = () => setWsStatus("Connecte");

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				switch (data.type) {
					case "connected":
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
					case "heartbeat":
						ws.send(JSON.stringify({ type: "pong" }));
						break;
				}
			} catch (err) {
				console.error("Erreur parsing message WebSocket:", err);
			}
		};

		ws.onclose = () => setWsStatus("Deconnecte");
		ws.onerror = (error) => {
			console.error("Erreur WebSocket:", error);
			setWsStatus("Erreur");
		};

		return () => {
			if (ws && ws.readyState === WebSocket.OPEN) ws.close();
		};
	}, [token, user?.id]);

	useEffect(() => {
		if (token && user?.id) {
			fetchFriends();
			fetchRequests();
			fetchBlockedUsers();
		}
	}, [token, user?.id]);

	const sendRequest = async () => {
		if (!newFriend.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`${API_BASE_URL}/api/friend-requests`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ display_name: newFriend.trim() }),
			});
			const data = await res.json();
			if (res.ok) {
				setNewFriend("");
				fetchRequests();
			} else {
				setError(data.error || t("errors.unknown"));
			}
		} catch (err) {
			setError(t("errors.network"));
		} finally {
			setLoading(false);
		}
	};

	const acceptRequest = async (senderId: number) => {
		try {
			const res = await fetch(
				`${API_BASE_URL}/api/friend-requests/${senderId}/accept`,
				{
					method: "POST",
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			if (res.ok) {
				fetchFriends();
				fetchRequests();
			} else {
				const data = await res.json();
				setError(data.error || t("errors.unknown"));
			}
		} catch (err) {
			setError(t("errors.network"));
		}
	};

	const rejectRequest = async (senderId: number) => {
		try {
			const res = await fetch(
				`${API_BASE_URL}/api/friend-requests/${senderId}/reject`,
				{
					method: "POST",
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			if (res.ok) {
				fetchRequests();
			} else {
				const data = await res.json();
				setError(data.error || t("errors.unknown"));
			}
		} catch (err) {
			setError(t("errors.network"));
		}
	};

	const removeFriend = async (friendId: number) => {
		if (!confirm(t("friends.confirmDelete"))) return;
		try {
			const res = await fetch(`${API_BASE_URL}/api/friends/${friendId}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) fetchFriends();
			else {
				const data = await res.json();
				setError(data.error || t("errors.unknown"));
			}
		} catch (err) {
			setError(t("errors.network"));
		}
	};

	const blockUser = async (userId: number) => {
		if (!confirm(t("friends.confirmBlock"))) return;
		try {
			const res = await fetch(`${API_BASE_URL}/api/block-user`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ user_id: userId }),
			});
			if (res.ok) {
				fetchFriends();
				fetchRequests();
				fetchBlockedUsers();
			} else {
				const data = await res.json();
				setError(data.error || t("errors.unknown"));
			}
		} catch (err) {
			setError(t("errors.network"));
		}
	};

	const unblockUser = async (userId: number) => {
		if (!confirm(t("friends.confirmUnblock"))) return;
		try {
			const res = await fetch(
				`${API_BASE_URL}/api/blocked-users/${userId}`,
				{
					method: "DELETE",
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			if (res.ok) fetchBlockedUsers();
			else {
				const data = await res.json();
				setError(data.error || t("errors.unknown"));
			}
		} catch (err) {
			setError(t("errors.network"));
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !loading) sendRequest();
	};
	const isOnline = (v?: number | boolean) => v === true || v === 1;

	return (
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
									: "border-transparent text-gray-500 hover:text-gray-700 hover;border-gray-300"
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
														isOnline(f.online)
															? "text-green-600"
															: "text-gray-500"
													}`}
												>
													{isOnline(f.online)
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
												onClick={() => blockUser(f.id)}
												className="bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors"
											>
												{t("common.block")}
											</button>
											<button
												onClick={() =>
													removeFriend(f.id)
												}
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
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
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
													onClick={() =>
														acceptRequest(
															r.sender_id
														)
													}
													className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
												>
													Accepter
												</button>
												<button
													onClick={() =>
														rejectRequest(
															r.sender_id
														)
													}
													className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
												>
													Refuser
												</button>
												<button
													onClick={() =>
														blockUser(r.sender_id)
													}
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
											onClick={() => unblockUser(u.id)}
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
	);
}
