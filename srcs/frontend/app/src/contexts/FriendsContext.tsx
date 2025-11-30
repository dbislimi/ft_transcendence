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
import { API_BASE_URL } from "../config/api";

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
	refreshFriends: () => Promise<void>;
	acceptFriendRequest: (senderId: number) => Promise<void>;
	rejectFriendRequest: (senderId: number) => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | null>(null);

export const FriendsProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [friends, setFriends] = useState<Friend[]>([]);
	const { token, user } = useUser();
	const { notify } = useNotifications();

	const isOnline = (userId: number): boolean => {
		const friend = friends.find((f) => f.id === userId);
		return friend ? friend.online === true || friend.online === 1 : false;
	};

	const isOnlineStatus = (online?: number | boolean): boolean => {
		return online === true || online === 1;
	};

	const refreshFriends = useCallback(async (): Promise<void> => {
		if (!token) return;

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
	}, [token]);

	const acceptFriendRequest = useCallback(
		async (senderId: number): Promise<void> => {
			if (!token) return;

			try {
				const res = await fetch(
					`${API_BASE_URL}/api/friend-requests/${senderId}/accept`,
					{
						method: "POST",
						headers: { Authorization: `Bearer ${token}` },
					}
				);

				if (res.ok) {
					refreshFriends();
					window.dispatchEvent(
						new CustomEvent("refreshFriendRequests")
					);
				}
			} catch (err) {
				console.error(
					"Erreur lors de l'acceptation de la demande:",
					err
				);
			}
		},
		[token, refreshFriends]
	);

	const rejectFriendRequest = useCallback(
		async (senderId: number): Promise<void> => {
			if (!token) return;

			try {
				const res = await fetch(
					`${API_BASE_URL}/api/friend-requests/${senderId}/reject`,
					{
						method: "POST",
						headers: { Authorization: `Bearer ${token}` },
					}
				);

				if (res.ok) {
					window.dispatchEvent(
						new CustomEvent("refreshFriendRequests")
					);
				}
			} catch (err) {
				console.error("Erreur lors du rejet de la demande:", err);
			}
		},
		[token]
	);

	useEffect(() => {
		if (token && user?.id) {
			refreshFriends();
		} else {
			setFriends([]);
		}
	}, [token, user?.id]);

	useEffect(() => {
		const handleFriendsMessage = (event: CustomEvent) => {
			const data = event.detail;

			switch (data.type) {
				case "connected":
					console.log("Friends WebSocket: connecté");
					break;

				case "friend_request_received":
					refreshFriends();
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
					notify({
						variant: "success",
						title: "Demande acceptée",
						message: `${data.display_name} a accepté votre demande d'ami`,
						duration: 5000,
					});
					break;

				case "friend_request_rejected":
					refreshFriends();
					notify({
						variant: "warning",
						title: "Demande refusée",
						message: `${data.display_name} a refusé votre demande d'ami`,
						duration: 5000,
					});
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
	}, [refreshFriends]);

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
