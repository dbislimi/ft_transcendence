import React, { createContext, useContext, useState, useCallback } from "react";

interface GameSettingsContextValue {
	bonusEnabled: boolean;
	setBonusEnabled: (enabled: boolean) => void;
}

const defaultBonus = false;
const GameSettingsContext = createContext<GameSettingsContextValue | undefined>(
	undefined
);

const STORAGE_KEY = "pong-bonus-enabled";

export const GameSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [bonusEnabled, setBonusEnabledState] = useState<boolean>(() => {
		try {
			const stored = sessionStorage.getItem(STORAGE_KEY);
			return stored !== null ? JSON.parse(stored) : defaultBonus;
		} catch {
			return defaultBonus;
		}
	});

	const setBonusEnabled = useCallback((enabled: boolean) => {
		setBonusEnabledState(enabled);
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
	}, []);

	const value = {
		bonusEnabled,
		setBonusEnabled,
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
