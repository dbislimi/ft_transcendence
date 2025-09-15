import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameConfig } from "../core/types";
import SpaceBackground from "../../Components/SpaceBackground";
import ChoiceGroup from "../../Components/ChoiceGroup";
import GameCard from "../../Components/GameCard";

interface MenuProps {
	onStart: (config: GameConfig) => void;
	onCancel: () => void;
}

export default function Menu({ onStart, onCancel }: MenuProps) {
	const { t } = useTranslation();
	const [playersCount, setPlayersCount] = useState<number>(2);

	const handleStart = () => {
		const config: GameConfig = {
			livesPerPlayer: 3,
			turnDurationMs: 15000,
			playersCount,
		};
		onStart(config);
	};

	return (
		<>
			<SpaceBackground />
			<div className="flex items-center justify-center min-h-screen p-6">
				<GameCard
					title={t("bombParty.menu.title")}
					subtitle={t("bombParty.menu.subtitle")}
					confirmLabel={t("bombParty.menu.startGame")}
					cancelLabel={t("common.cancel", { defaultValue: "Cancel" })}
					onConfirm={handleStart}
					onCancel={() => {
						setPlayersCount(2);
						onCancel();
					}}
				>
					<ChoiceGroup
						label={t("bombParty.menu.playersCount")}
						options={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
							(n) => ({
								value: n as number,
								label: String(n),
							})
						)}
						value={playersCount}
						onChange={(val) => setPlayersCount(val as number)}
						columns={6}
						color="cyan"
						variant="sm"
					/>
					<div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
						<h3 className="text-slate-200 font-medium mb-2">
							{t("bombParty.menu.rules.title")}
						</h3>
						<ul className="text-slate-400 text-sm space-y-1">
							<li>• {t("bombParty.menu.rules.rule1")}</li>
							<li>• {t("bombParty.menu.rules.rule2")}</li>
							<li>• {t("bombParty.menu.rules.rule3")}</li>
							<li>• {t("bombParty.menu.rules.rule4")}</li>
						</ul>
					</div>
				</GameCard>
			</div>
		</>
	);
}
