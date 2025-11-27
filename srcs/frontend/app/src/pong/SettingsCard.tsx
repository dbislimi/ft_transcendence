import { useState } from "react";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../Components/SpaceBackground";
import BackgroundSurface from "../Components/BackgroundSurface";
import ChoiceGroup from "../Components/ChoiceGroup";
import { useWebSocket } from "../context/WebSocketContext";
import { useUser } from "../context/UserContext";
import { useGameSettings } from "../context/GameSettingsContext";

interface SettingsCardProps {
	onCancel: () => void;
	cosmetics: {
		preferredSide: string;
		paddleColor: string;
		ballColor: string;
	};
	onUpdateCosmetics: (cosmetics: any) => void;
	onUpdateGameSettings: (settings: any) => void;
}

export function SettingsCard({
	onCancel,
	cosmetics,
	onUpdateCosmetics,
	onUpdateGameSettings,
}: SettingsCardProps) {
	const { t } = useTranslation();
	const [selectedMode, setSelectedMode] = useState<
		"cosmetics" | "gameSettings"
	>("gameSettings");
	const { pongWsRef } = useWebSocket();
	const { user, setUser } = useUser();
	const { settings } = useGameSettings();

	const [tempCosmetics, setTempCosmetics] = useState({
		preferredSide: cosmetics?.preferredSide || "left",
		paddleColor: cosmetics?.paddleColor || "White",
		ballColor: cosmetics?.ballColor || "Rose",
	});

	const [bonusNb, setBonusNb] = useState(settings.bonusNb);
	const [selectedBonuses, setSelectedBonuses] = useState<string[]>(
		settings.bonusTypes
	);
	const [playerSpeed, setPlayerSpeed] = useState(settings.playerSpeed);

	const BONUS_TYPES = [
		{ id: "Bigger", label: "Bigger" },
		{ id: "Smaller", label: "Smaller" },
		{ id: "Faster", label: "Faster" },
	];

	const hasCosmeticsChanges =
		tempCosmetics.preferredSide !== (cosmetics?.preferredSide || "left") ||
		tempCosmetics.paddleColor !== (cosmetics?.paddleColor || "White") ||
		tempCosmetics.ballColor !== (cosmetics?.ballColor || "Rose");

	const hasGameSettingsChanges =
		bonusNb !== settings.bonusNb ||
		playerSpeed !== settings.playerSpeed ||
		JSON.stringify(selectedBonuses.sort()) !==
			JSON.stringify(settings.bonusTypes.sort());

	const hasChanges =
		selectedMode === "cosmetics"
			? hasCosmeticsChanges
			: hasGameSettingsChanges;

	const handleCosmeticsSave = () => {
		if (pongWsRef.current) {
			pongWsRef.current.send(
				JSON.stringify({
					event: "update_cosmetics",
					to: "user_settings",
					body: tempCosmetics,
				})
			);
		}
		if (user) {
			setUser({
				...user,
				cosmetics: tempCosmetics,
			});
		}
		onUpdateCosmetics(tempCosmetics);
	};

	const handleGameSettingsConfirm = () => {
		const newSettings = {
			bonusNb,
			bonusTypes: selectedBonuses,
			playerSpeed,
		};
		onUpdateGameSettings(newSettings);
	};

	const handleSave = () => {
		if (selectedMode === "cosmetics") {
			handleCosmeticsSave();
		} else {
			handleGameSettingsConfirm();
		}
		onCancel();
	};

	return (
		<BackgroundSurface game="pong">
			<SpaceBackground />
			<div className="min-h-screen flex items-center justify-center p-6">
				<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-2xl w-full shadow-2xl relative animate-fadeIn">
					<div className="flex items-center justify-between mb-8">
						<h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
							{t("nav.settings") || "Settings"}
						</h1>
						<button
							onClick={onCancel}
							className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-white transition-colors"
						>
							{t("common.close") || "Close"}
						</button>
					</div>

					<div className="space-y-8">
						<ChoiceGroup
							label={t("settings.display.title") || "Mode"}
							options={["Cosmétique", "Jeu"]}
							value={
								selectedMode === "cosmetics"
									? "Cosmétique"
									: "Jeu"
							}
							onChange={(value) =>
								setSelectedMode(
									value === "Cosmétique"
										? "cosmetics"
										: "gameSettings"
								)
							}
							columns={2}
							color="cyan"
							variant="lg"
						/>

						{selectedMode === "cosmetics" ? (
							<div className="space-y-6 animate-slideIn">
								<ChoiceGroup
									label="Côté préféré"
									options={["Gauche", "Droite"]}
									value={
										tempCosmetics.preferredSide === "left"
											? "Gauche"
											: "Droite"
									}
									onChange={(value) =>
										setTempCosmetics((prev) => ({
											...prev,
											preferredSide:
												value === "Gauche"
													? "left"
													: "right",
										}))
									}
									columns={2}
									color="purple"
									variant="md"
								/>
								<ChoiceGroup
									label="Skin Paddle"
									options={[
										{ label: "White", color: "#ffffff" },
										{ label: "Cyan", color: "#06b6d4" },
										{ label: "Emerald", color: "#10b981" },
										{ label: "Rose", color: "#f43f5e" },
										{ label: "Blue", color: "#3b82f6" },
										{ label: "Amber", color: "#f59e0b" },
									]}
									value={tempCosmetics.paddleColor}
									onChange={(value) =>
										setTempCosmetics((prev) => ({
											...prev,
											paddleColor: value as string,
										}))
									}
									columns={3}
									color="purple"
									variant="sm"
								/>
								<ChoiceGroup
									label="Skin Balle"
									options={[
										{ label: "White", color: "#ffffff" },
										{ label: "Cyan", color: "#06b6d4" },
										{ label: "Emerald", color: "#10b981" },
										{ label: "Rose", color: "#f43f5e" },
										{ label: "Blue", color: "#3b82f6" },
										{ label: "Amber", color: "#f59e0b" },
									]}
									value={tempCosmetics.ballColor}
									onChange={(value) =>
										setTempCosmetics((prev) => ({
											...prev,
											ballColor: value as string,
										}))
									}
									columns={3}
									color="purple"
									variant="sm"
								/>
							</div>
						) : (
							<div className="space-y-6 animate-slideIn">
								<ChoiceGroup
									label="Nombre de bonus simultanés"
									options={["0", "1", "2", "3", "4"]}
									value={bonusNb.toString()}
									onChange={(value) =>
										setBonusNb(Number(value))
									}
									columns={5}
									color="purple"
									variant="md"
								/>
								<ChoiceGroup
									label="Types de bonus"
									options={BONUS_TYPES.map(
										(bonus) => bonus.label
									)}
									value={selectedBonuses
										.map((id) => {
											const bonus = BONUS_TYPES.find(
												(b) => b.id === id
											);
											return bonus ? bonus.label : "";
										})
										.filter((label) => label !== "")}
									onChange={(values) => {
										const selectedIds = BONUS_TYPES.filter(
											(bonus) =>
												(values as string[]).includes(
													bonus.label
												)
										).map((bonus) => bonus.id);
										setSelectedBonuses(selectedIds);
									}}
									multiple={true}
									columns={3}
									color="purple"
									variant="md"
								/>
								<div>
									<label className="block text-sm font-medium text-slate-300 mb-2">
										Vitesse du joueur
									</label>
									<div className="relative">
										<input
											type="range"
											min="50"
											max="200"
											step="10"
											value={playerSpeed}
											onChange={(e) =>
												setPlayerSpeed(
													Number(e.target.value)
												)
											}
											className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700"
											style={{
												background: `linear-gradient(to right, rgb(139, 92, 246) 0%, rgb(139, 92, 246) ${
													((playerSpeed - 50) /
														(200 - 50)) *
													100
												}%, rgb(51, 65, 85) ${
													((playerSpeed - 50) /
														(200 - 50)) *
													100
												}%, rgb(51, 65, 85) 100%)`,
											}}
										/>
									</div>
									<div className="text-center text-slate-300 font-semibold mt-2">
										{playerSpeed}
									</div>
								</div>
							</div>
						)}

						<div className="pt-6 border-t border-slate-700/50 flex justify-end gap-4">
							<button
								onClick={onCancel}
								className="px-6 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-all"
							>
								{t("common.cancel") || "Cancel"}
							</button>
							<button
								onClick={handleSave}
								disabled={!hasChanges}
								className={`px-6 py-2 rounded-lg font-semibold transition-all ${
									hasChanges
										? "bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg hover:shadow-cyan-500/25"
										: "bg-slate-700 text-slate-500 cursor-not-allowed"
								}`}
							>
								{t("common.save") || "Save"}
							</button>
						</div>
					</div>
				</div>
			</div>
		</BackgroundSurface>
	);
}
