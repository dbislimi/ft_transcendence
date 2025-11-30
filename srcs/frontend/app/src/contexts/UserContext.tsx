import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from "react";

import { API_BASE_URL, WS_BASE_URL } from "../config/api";

interface User {
	id: number;
	name: string;
	email: string;
	display_name: string;
	avatar?: string;
	wins?: number;
	losses?: number;
	created_at?: string;
	cosmetics: {
		preferredSide: string;
		paddleColor: string;
		ballColor: string;
	};
}

interface UserContextType {
	isLoading: boolean;
	user: User | null;
	refreshUser: () => Promise<void>;
	setToken: (token: string | null) => void;
	token: string | null;
	login: (userData: User, token: string) => void;
	logout: () => void;
	isAuthenticated: boolean;
	setUser: (user: User | null) => void;
	setGuestName: (name: string) => void;
}

const UserContext = createContext<UserContextType>({
	isLoading: true,
	user: null,
	refreshUser: async () => {},
	setToken: () => {},
	token: null,
	login: () => {},
	logout: () => {},
	isAuthenticated: false,
	setUser: () => {},
	setGuestName: () => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [user, setUser] = useState<User | null>(null);
	const [token, setTokenState] = useState<string | null>(() => {
		try {
			const storedToken = sessionStorage.getItem("token");
			if (storedToken === "undefined") return null;
			
			if (storedToken) {
				try {
					const payload = JSON.parse(atob(storedToken.split('.')[1]));
					const isExpired = payload.exp * 1000 < Date.now();
					if (isExpired) {
						sessionStorage.removeItem("token");
						return null;
					}
				} catch (e) {
					sessionStorage.removeItem("token");
					return null;
				}
			}
			
			return storedToken;
		} catch {
			return null;
		}
	});

	useEffect(() => {
		if (!token) return;

		const checkTokenExpiration = () => {
			try {
				const payload = JSON.parse(atob(token.split('.')[1]));
				const isExpired = payload.exp * 1000 < Date.now();
				if (isExpired) {
					console.log("Token expiré, déconnexion automatique");
					setToken(null);
				}
			} catch (e) {
				console.error("Erreur lors de la vérification du token:", e);
				setToken(null);
			}
		};

		const interval = setInterval(checkTokenExpiration, 30000);
		checkTokenExpiration();

		return () => clearInterval(interval);
	}, [token]);

	const logoutUser = async (currentToken?: string | null) => {
		if (currentToken) {
			try {
				await fetch(`${API_BASE_URL}/api/logout`, {
					method: "POST",
					headers: { Authorization: `Bearer ${token}` },
				});
			} catch (error) {
				const blob = new Blob([JSON.stringify({})], {
					type: "application/json",
				});
				navigator.sendBeacon(`${API_BASE_URL}/api/logout`, blob);
			}
		}
	};

	const setToken = async (newToken: string | null) => {
		if (newToken && newToken !== "undefined") {
			sessionStorage.setItem("token", newToken);
			setTokenState(newToken);
		} else {
			const currentToken = token;
			sessionStorage.removeItem("token");
			setTokenState(null);
			setUser(null);

			await logoutUser(currentToken);
		}
	};

	const setGuestName = useCallback(
		(name: string) => {
			try {
				sessionStorage.setItem("guestName", name);
			} catch (e) {
				console.error("Failed to save guestName:", e);
			}
			if (!token) {
				setUser({
					id: -1,
					name,
					email: "",
					display_name: name,
					avatar: "",
					wins: 0,
					losses: 0,
					cosmetics: {
						preferredSide: "left",
						paddleColor: "White",
						ballColor: "White",
					},
				});
			}
		},
		[token]
	);

	const login = (userData: User, userToken: string) => {
		setUser(userData);
		sessionStorage.setItem("token", userToken);
		setTokenState(userToken);
	};

	const logout = () => {
		setToken(null);
	};

	const refreshUser = async () => {
		setIsLoading(true);
		if (!token) {
			try {
				const guestName = sessionStorage.getItem("guestName") || "";
				setUser({
					id: -1,
					name: guestName,
					email: "",
					display_name: guestName,
					avatar: "",
					wins: 0,
					losses: 0,
					cosmetics: {
						preferredSide: "left",
						paddleColor: "White",
						ballColor: "White",
					},
				});
			} catch {
				setUser({
					id: -1,
					name: "",
					email: "",
					display_name: "",
					avatar: "",
					wins: 0,
					losses: 0,
					cosmetics: {
						preferredSide: "left",
						paddleColor: "White",
						ballColor: "White",
					},
				});
			}
			setIsLoading(false);
			return;
		}
		try {
			const res = await fetch(`${API_BASE_URL}/api/me`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			if (res.ok) {
				const data = await res.json();
				setUser({
					...data,
					avatar:
						data.avatar && data.avatar.trim() !== ""
							? data.avatar
							: "/avatars/avatar1.png",
				});
			} else if (res.status === 401) {
				console.log("Token invalide, déconnexion");
				setToken(null);
			} else {
				throw new Error(`HTTP ${res.status}`);
			}
		} catch (error) {
			console.error("Erreur lors du refresh user:", error);
		}
		setIsLoading(false);
	};

	useEffect(() => {
		refreshUser();
	}, [token]);

	useEffect(() => {
		const handleBeforeUnload = () => {
			if (token) {
				const blob = new Blob([JSON.stringify({ token })], {
					type: "application/json",
				});
				navigator.sendBeacon(`${API_BASE_URL}/api/logout`, blob);
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [token]);

	const isAuthenticated = !!token && !!user;

	return (
		<UserContext.Provider
			value={{
				isLoading,
				user,
				refreshUser,
				setToken,
				token,
				login,
				logout,
				isAuthenticated,
				setUser,
				setGuestName,
			}}
		>
			{children}
		</UserContext.Provider>
	);
};

export const useUser = () => useContext(UserContext);
