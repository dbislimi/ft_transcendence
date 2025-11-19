import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useMemo,
} from "react";

export type GameSession = {
	sessionId?: string;
	sessionType: "invite" | "quick" | "tournament" | "offline";
	opponent: string;
	opponentPaddleColor?: string;
	self: string;
	side: 0 | 1 | null;
	labels: { self: string; opponent: string };
	tournamentDepth?: number | null;
	countdownStart?: number;
};

interface GameSessionContextValue {
	session: GameSession | null;
	setSession: (s: GameSession | null) => void;
	clearSession: () => void;
}

const GameSessionContext = createContext<GameSessionContextValue | undefined>(
	undefined
);

export const GameSessionProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [session, setSessionState] = useState<GameSession | null>(null);

	const setSession = useCallback((s: GameSession | null) => {
		setSessionState(s);
	}, []);

	const clearSession = useCallback(() => setSession(null), [setSession]);

	const value = useMemo(
		() => ({ session, setSession, clearSession }),
		[session, setSession, clearSession]
	);

	return (
		<GameSessionContext.Provider value={value}>
			{children}
		</GameSessionContext.Provider>
	);
};

export function useGameSession() {
	const ctx = useContext(GameSessionContext);
	if (!ctx)
		throw new Error(
			"useGameSession must be used within GameSessionProvider"
		);
	return ctx;
}
