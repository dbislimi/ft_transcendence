import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from "react";

interface User {
	id: number;
	name: string;
	email: string;
	display_name: string;
	avatar?: string;
	wins?: number;
	losses?: number;
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
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [user, setUser] = useState<User | null>(null);
	const [token, setTokenState] = useState<string | null>(() => {
		try {
			return sessionStorage.getItem("token");
		} catch {
			return null;
		}
	});

	const logoutUser = async (currentToken?: string | null) => {
		if (currentToken) {
			try {
				await fetch("http://localhost:3000/logout", {
					method: "POST",
					headers: { Authorization: `Bearer ${currentToken}` },
				});
			} catch (error) {
				const blob = new Blob([JSON.stringify({})], {
					type: "application/json",
				});
				navigator.sendBeacon("http://localhost:3000/logout", blob);
			}
		}
	};

	const setToken = async (newToken: string | null) => {
		if (newToken) {
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
			setUser(null);
			setIsLoading(false);
			return;
		}
		try {
			const res = await fetch("http://localhost:3000/me", {
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
			} else {
				setToken(null);
			}
		} catch {
			setUser(null);
		}
		setIsLoading(false);
	};

	useEffect(() => {
		console.log("refreshUser");
		refreshUser();
	}, [token]);

	useEffect(() => {
		const handleBeforeUnload = () => {
			if (token) {
				const blob = new Blob([JSON.stringify({})], {
					type: "application/json",
				});
				navigator.sendBeacon("http://localhost:3000/logout", blob);
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
			}}
		>
			{children}
		</UserContext.Provider>
	);
};

export const useUser = () => useContext(UserContext);
