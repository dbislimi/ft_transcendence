import GameCard from "./GameCard";
import ChoiceGroup from "./ChoiceGroup";
import { useState } from "react";

type Difficulty = "easy" | "medium" | "hard";

export type OfflineConfig = {
	gamemode: string;
	botDiff: Difficulty;
};

interface OfflineCardProps {
	onCancel: () => void;
	onConfirm: ({ gamemode, botDiff }: OfflineConfig) => void;
}

export function OfflineCard({ onCancel, onConfirm }: OfflineCardProps) {
	const [gamemode, setGamemode] = useState<string>("solo");
	const [botDifficulty, setBotDifficulty] = useState<Difficulty>("medium");

	return (
		<div className="absolute inset-0 flex items-center justify-center p-4">
			<GameCard
				title="Offline Mode"
				onCancel={onCancel}
				onConfirm={() =>
					onConfirm({
						gamemode: gamemode,
						botDiff: botDifficulty,
					})
				}
			>
				<div className="space-y-6">
					<ChoiceGroup
						label="Players"
						options={["solo", "duo"]}
						value={gamemode}
						onChange={(val) => setGamemode(val as string)}
						columns={2}
						color="cyan"
						variant="lg"
					/>
					{gamemode !== "duo" && (
						<ChoiceGroup
							label="Bot Difficulty"
							options={["easy", "medium", "hard"]}
							value={botDifficulty || ""}
							onChange={(val) =>
								setBotDifficulty(val as Difficulty)
							}
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
