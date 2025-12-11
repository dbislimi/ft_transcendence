import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import type { Dispatch, SetStateAction, ReactNode } from "react";
import { useUser } from "../contexts/UserContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useWebSocket } from "../contexts/WebSocketContext";

interface Friend {
	id: number;
	display_name: string;
	avatar?: string;
	online?: number | boolean;
}

interface FriendsContextType {
	friends: Friend[];
	setFriends: Dispatch<SetStateAction<Friend[]>>;
	isOnline: (userId: number) => boolean;
	isOnlineStatus: (online?: number | boolean) => boolean;
	refreshFriends: () => void;
	acceptFriendRequest: (senderId: number) => void;
	rejectFriendRequest: (senderId: number) => void;
	sendFriendRequest: (
		displayName: string
	) => Promise<{ success: boolean; error?: string }>;
	removeFriend: (friendId: number) => void;
	blockUser: (userId: number) => void;
	unblockUser: (userId: number) => void;
}

const FriendsContext = createContext<FriendsContextType | null>(null);

export const FriendsProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [friends, setFriends] = useState<Friend[]>([]);
	const { token, user } = useUser();
	const { notify } = useNotifications();
	const { friendsWsRef } = useWebSocket();

	const isOnline = (userId: number): boolean => {
		const friend = friends.find((f) => f.id === userId);
		return friend ? friend.online === true || friend.online === 1 : false;
	};

	const isOnlineStatus = (online?: number | boolean): boolean => {
		return online === true || online === 1;
	};

	const refreshFriends = useCallback((): void => {
		if (
			friendsWsRef.current &&
			friendsWsRef.current.readyState === WebSocket.OPEN
		) {
			friendsWsRef.current.send(JSON.stringify({ type: "get_friends" }));
		}
	}, [friendsWsRef]);

	const sendFriendRequest = useCallback(
		async (
			displayName: string
		): Promise<{ success: boolean; error?: string }> => {
			return new Promise((resolve) => {
				if (
					!friendsWsRef.current ||
					friendsWsRef.current.readyState !== WebSocket.OPEN
				) {
					resolve({ success: false, error: "Connexion non établie" });
					return;
				}

				const handler = (event: MessageEvent) => {
					try {
						const data = JSON.parse(event.data);
						if (data.type === "friend_request_sent") {
							friendsWsRef.current?.removeEventListener(
								"message",
								handler
							);
							if (data.error) {
								resolve({ success: false, error: data.error });
							} else {
								window.dispatchEvent(
									new CustomEvent("refreshFriendRequests")
								);
								resolve({ success: true });
							}
						}
					} catch (e) {}
				};

				friendsWsRef.current.addEventListener("message", handler);
				friendsWsRef.current.send(
					JSON.stringify({
						type: "send_friend_request",
						display_name: displayName,
					})
				);

				setTimeout(() => {
					friendsWsRef.current?.removeEventListener(
						"message",
						handler
					);
					resolve({ success: false, error: "Timeout" });
				}, 5000);
			});
		},
		[friendsWsRef]
	);

	const acceptFriendRequest = useCallback(
		(senderId: number): void => {
			if (
				friendsWsRef.current &&
				friendsWsRef.current.readyState === WebSocket.OPEN
			) {
				friendsWsRef.current.send(
					JSON.stringify({
						type: "accept_friend_request",
						sender_id: senderId,
					})
				);
			}
		},
		[friendsWsRef]
	);

	const rejectFriendRequest = useCallback(
		(senderId: number): void => {
			if (
				friendsWsRef.current &&
				friendsWsRef.current.readyState === WebSocket.OPEN
			) {
				friendsWsRef.current.send(
					JSON.stringify({
						type: "reject_friend_request",
						sender_id: senderId,
					})
				);
			}
		},
		[friendsWsRef]
	);

	const removeFriend = useCallback(
		(friendId: number): void => {
			if (
				friendsWsRef.current &&
				friendsWsRef.current.readyState === WebSocket.OPEN
			) {
				friendsWsRef.current.send(
					JSON.stringify({
						type: "remove_friend",
						friend_id: friendId,
					})
				);
			}
		},
		[friendsWsRef]
	);

	const blockUser = useCallback(
		(userId: number): void => {
			if (
				friendsWsRef.current &&
				friendsWsRef.current.readyState === WebSocket.OPEN
			) {
				friendsWsRef.current.send(
					JSON.stringify({
						type: "block_user",
						user_id: userId,
					})
				);
			}
		},
		[friendsWsRef]
	);

	const unblockUser = useCallback(
		(userId: number): void => {
			if (
				friendsWsRef.current &&
				friendsWsRef.current.readyState === WebSocket.OPEN
			) {
				friendsWsRef.current.send(
					JSON.stringify({
						type: "unblock_user",
						user_id: userId,
					})
				);
			}
		},
		[friendsWsRef]
	);

	useEffect(() => {
		if (token && user?.id) {
			refreshFriends();
		} else {
			setFriends([]);
		}
	}, [token, user?.id, refreshFriends]);

	useEffect(() => {
		const handleFriendsMessage = (event: CustomEvent) => {
			const data = event.detail;

			switch (data.type) {
				case "connected":
					console.log("Friends WebSocket: connecté");
					refreshFriends();
					break;

				case "friends_list":
					if (data.data) {
						setFriends(data.data);
					}
					break;

				case "friend_request_received":
					refreshFriends();
					window.dispatchEvent(
						new CustomEvent("refreshFriendRequests")
					);
					notify({
						variant: "info",
						title: "Nouvelle demande d'ami",
						message: `${data.display_name} vous a envoyé une demande d'ami`,
						duration: 10000,
						actions: [
							{
								label: "Accepter",
								primary: true,
								onPress: () => acceptFriendRequest(data.from),
							},
							{
								label: "Refuser",
								onPress: () => rejectFriendRequest(data.from),
							},
						],
					});
					break;

				case "friend_request_accepted":
					refreshFriends();
					window.dispatchEvent(
						new CustomEvent("refreshFriendRequests")
					);
					notify({
						variant: "success",
						title: "Demande acceptée",
						message: `${data.display_name} a accepté votre demande d'ami`,
						duration: 5000,
					});
					break;

				case "friend_request_accepted_response":
					refreshFriends();
					window.dispatchEvent(
						new CustomEvent("refreshFriendRequests")
					);
					if (data.error) {
						notify({
							variant: "error",
							title: "Erreur",
							message: data.error,
							duration: 5000,
						});
					} else {
						notify({
							variant: "success",
							title: "Demande acceptée",
							message:
								data.message || "Demande acceptée avec succès",
							duration: 5000,
						});
					}
					break;

				case "friend_request_rejected":
					refreshFriends();
					window.dispatchEvent(
						new CustomEvent("refreshFriendRequests")
					);
					notify({
						variant: "warning",
						title: "Demande refusée",
						message: `${data.display_name} a refusé votre demande d'ami`,
						duration: 5000,
					});
					break;

				case "friend_request_rejected_response":
					window.dispatchEvent(
						new CustomEvent("refreshFriendRequests")
					);
					if (data.error) {
						notify({
							variant: "error",
							title: "Erreur",
							message: data.error,
							duration: 5000,
						});
					}
					break;

				case "friend_removed":
					refreshFriends();
					notify({
						variant: "info",
						title: "Ami supprimé",
						message: `${data.display_name} vous a retiré de sa liste d'amis`,
						duration: 5000,
					});
					break;

				case "friend_removed_response":
					refreshFriends();
					if (data.error) {
						notify({
							variant: "error",
							title: "Erreur",
							message: data.error,
							duration: 5000,
						});
					} else {
						notify({
							variant: "success",
							title: "Ami supprimé",
							message: data.message || "Ami supprimé avec succès",
							duration: 3000,
						});
					}
					break;

				case "user_blocked":
					refreshFriends();
					window.dispatchEvent(
						new CustomEvent("refreshFriendRequests")
					);
					break;

				case "user_blocked_response":
					refreshFriends();
					window.dispatchEvent(
						new CustomEvent("refreshFriendRequests")
					);
					window.dispatchEvent(
						new CustomEvent("refreshBlockedUsers")
					);
					if (data.error) {
						notify({
							variant: "error",
							title: "Erreur",
							message: data.error,
							duration: 5000,
						});
					} else {
						notify({
							variant: "success",
							title: "Utilisateur bloqué",
							message:
								data.message ||
								"Utilisateur bloqué avec succès",
							duration: 3000,
						});
					}
					break;

				case "user_unblocked_response":
					window.dispatchEvent(
						new CustomEvent("refreshBlockedUsers")
					);
					if (data.error) {
						notify({
							variant: "error",
							title: "Erreur",
							message: data.error,
							duration: 5000,
						});
					} else {
						notify({
							variant: "success",
							title: "Utilisateur débloqué",
							message:
								data.message ||
								"Utilisateur débloqué avec succès",
							duration: 3000,
						});
					}
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
					if (
						friendsWsRef.current &&
						friendsWsRef.current.readyState === WebSocket.OPEN
					) {
						friendsWsRef.current.send(
							JSON.stringify({ type: "pong" })
						);
					}
					break;
			}
		};

		window.addEventListener(
			"friendsWebSocketMessage",
			handleFriendsMessage as EventListener
		);

		return () => {
			window.removeEventListener(
				"friendsWebSocketMessage",
				handleFriendsMessage as EventListener
			);
		};
	}, [
		refreshFriends,
		notify,
		acceptFriendRequest,
		rejectFriendRequest,
		friendsWsRef,
	]);

	return (
		<FriendsContext.Provider
			value={{
				friends,
				setFriends,
				isOnline,
				isOnlineStatus,
				refreshFriends,
				acceptFriendRequest,
				rejectFriendRequest,
				sendFriendRequest,
				removeFriend,
				blockUser,
				unblockUser,
			}}
		>
			{children}
		</FriendsContext.Provider>
	);
};

export function useFriends() {
	const context = useContext(FriendsContext);
	if (!context) {
		throw new Error("useFriends must be used inside FriendsProvider");
	}
	return context;
}
