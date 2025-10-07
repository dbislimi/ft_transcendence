import GameCard from "./GameCard";
import ChoiceGroup from "./ChoiceGroup";
import { useState } from "react";
import type { Difficulty } from "../hooks/usePongParams";
interface OfflineCardProps {
	onCancel: () => void;
	onConfirm: (cfg: { gamemode: string; botDifficulty: Difficulty }) => void;
}

export function OfflineCard({ onCancel, onConfirm }: OfflineCardProps) {
	const [gamemode, setGamemode] = useState<string>("solo");
	const [botDifficulty, setBotDifficulty] = useState<string>("medium");

	return (
		<div className="absolute inset-0 flex items-center justify-center p-4">
			<GameCard
				title="Offline Mode"
				onCancel={onCancel}
				onConfirm={() =>
					onConfirm({
						gamemode: gamemode,
						botDifficulty: botDifficulty as Difficulty,
					})
				}
			>
				<div className="space-y-6">
					<ChoiceGroup
						label="Players"
						options={["solo", "duo", "training"]}
						value={gamemode}
						onChange={(val) => setGamemode(val)}
						columns={3}
						color="cyan"
						variant="lg"
					/>
					{gamemode !== "duo" && (
						<ChoiceGroup
							label="Bot Difficulty"
							options={["easy", "medium", "hard"]}
							value={botDifficulty || ""}
							onChange={(val) => setBotDifficulty(val)}
							columns={3}
							color="purple"
							variant="sm"
						/>
					)}
				</div>
			</GameCard>
		</div>
	);
}
