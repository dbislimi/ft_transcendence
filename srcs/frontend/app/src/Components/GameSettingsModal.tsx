import { useState } from "react";
import { useGameSettings } from "../context/GameSettingsContext";

interface GameSettingsModalProps {
	onClose: () => void;
	onConfirm: (settings: GameSettings) => void;
}

export interface GameSettings {
	bonusNb: number;
	bonusTypes: string[];
	playerSpeed: number;
}

const BONUS_TYPES = [
	{ id: "Bigger", label: "Bigger" },
	{ id: "Smaller", label: "Smaller" },
	{ id: "Faster", label: "Faster" },
];

export default function GameSettingsModal({
	onClose,
	onConfirm,
}: GameSettingsModalProps) {
	const { settings } = useGameSettings();
	const [bonusNb, setBonusNb] = useState(settings.bonusNb);
	const [selectedBonuses, setSelectedBonuses] = useState<string[]>(
		settings.bonusTypes
	);
	const [playerSpeed, setPlayerSpeed] = useState(settings.playerSpeed);

	const handleBonusToggle = (bonusId: string) => {
		setSelectedBonuses((prev) =>
			prev.includes(bonusId)
				? prev.filter((id) => id !== bonusId)
				: [...prev, bonusId]
		);
	};

	const handleConfirm = () => {
		onConfirm({
			bonusNb,
			bonusTypes: selectedBonuses,
			playerSpeed,
		});
	};

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-purple-500/20 p-8 max-w-md w-full shadow-2xl">
				<h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-6 text-center">
					⚙️ Paramètres de jeu
				</h2>

				<div className="space-y-6">
					{/* Nombre de bonus */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Nombre de bonus simultanés
						</label>
						<input
							type="range"
							min="0"
							max="5"
							value={bonusNb}
							onChange={(e) => setBonusNb(Number(e.target.value))}
							className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
						/>
						<div className="text-center text-white font-semibold mt-1">
							{bonusNb}
						</div>
					</div>

					{/* Types de bonus */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-3">
							Types de bonus
						</label>
						<div className="space-y-2">
							{BONUS_TYPES.map((bonus) => (
								<label
									key={bonus.id}
									className="flex items-center space-x-3"
								>
									<input
										type="checkbox"
										checked={selectedBonuses.includes(
											bonus.id
										)}
										onChange={() =>
											handleBonusToggle(bonus.id)
										}
										className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
									/>
									<span className="text-gray-300">
										{bonus.label}
									</span>
								</label>
							))}
						</div>
					</div>

					{/* Vitesse du joueur */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Vitesse du joueur
						</label>
						<input
							type="range"
							min="30"
							max="150"
							step="10"
							value={playerSpeed}
							onChange={(e) =>
								setPlayerSpeed(Number(e.target.value))
							}
							className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
						/>
						<div className="text-center text-white font-semibold mt-1">
							{playerSpeed}
						</div>
					</div>
				</div>

				<div className="flex gap-4 mt-8">
					<button
						onClick={onClose}
						className="flex-1 px-4 py-3 bg-gray-600/20 text-gray-300 rounded-lg border border-gray-500/30 hover:border-gray-400/50 transition-all duration-200 font-medium"
					>
						Annuler
					</button>
					<button
						onClick={handleConfirm}
						className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
					>
						Confirmer
					</button>
				</div>
			</div>
		</div>
	);
}
