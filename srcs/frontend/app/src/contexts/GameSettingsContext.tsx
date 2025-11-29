import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
} from "react";

export type GameSettings = {
	bonusNb: number;
	bonusTypes: string[];
	playerSpeed: number;
};

interface GameSettingsContextValue {
	settings: GameSettings;
	setSettings: (settings: GameSettings) => void;
	updateSettings: (updates: Partial<GameSettings>) => void;
	resetToDefaults: () => void;
}

const defaultSettings: GameSettings = {
	bonusNb: 1,
	bonusTypes: ["Bigger", "Smaller", "Faster"],
	playerSpeed: 90,
};

const GameSettingsContext = createContext<GameSettingsContextValue | undefined>(
	undefined
);

const STORAGE_KEY = "pong-game-settings";

export const GameSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [settings, setSettingsState] = useState<GameSettings>(() => {
		try {
			const stored = sessionStorage.getItem(STORAGE_KEY);
			return stored
				? { ...defaultSettings, ...JSON.parse(stored) }
				: defaultSettings;
		} catch {
			return defaultSettings;
		}
	});

	const setSettings = useCallback((newSettings: GameSettings) => {
		setSettingsState(newSettings);
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
	}, []);

	const updateSettings = useCallback((updates: Partial<GameSettings>) => {
		setSettingsState((prev) => {
			const newSettings = { ...prev, ...updates };
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
			return newSettings;
		});
	}, []);

	const resetToDefaults = useCallback(() => {
		setSettingsState(defaultSettings);
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
	}, []);

	const value = {
		settings,
		setSettings,
		updateSettings,
		resetToDefaults,
	};

	return (
		<GameSettingsContext.Provider value={value}>
			{children}
		</GameSettingsContext.Provider>
	);
};

export const useGameSettings = () => {
	const context = useContext(GameSettingsContext);
	if (!context) {
		throw new Error(
			"useGameSettings must be used within a GameSettingsProvider"
		);
	}
	return context;
};
