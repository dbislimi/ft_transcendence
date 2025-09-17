import GameCard from "./GameCard";
import ChoiceGroup from "./ChoiceGroup";
import { useEffect, useState } from "react";
import type { Difficulty } from "../hooks/usePongParams";
interface OnlineCardProps {
	onCancel: () => void;
	onConfirm: (cfg: { gamemode: string; botDifficulty?: Difficulty }) => void;
}

export function OnlineCard({ onCancel, onConfirm }: OnlineCardProps) {
	const [gamemode, setGamemode] = useState<string>('solo');
	const [botDifficulty, setBotDifficulty] = useState<string | null>('medium');

	return (
		<div className="absolute inset-0 flex items-center justify-center p-4">
			<GameCard
				title="Online Mode"
				onCancel={onCancel}
				onConfirm={() => onConfirm({gamemode: gamemode, botDifficulty: botDifficulty as Difficulty})}
			>
				<div className="space-y-6">
					<ChoiceGroup
						label="Players"
						options={[
							{ value: 'solo', label: "solo" },
							{ value: 'duo', label: "duo" },
						]}
						value={gamemode}
						onChange={(val) => setGamemode(val)}
						columns={2}
						color="cyan"
						variant="lg"
					/>
					{gamemode === 'solo' && (
						<ChoiceGroup
							label="Bot Difficulty"
							options={["easy", "medium", "hard"].map((v) => ({
								value: v,
								label: v,
							}))}
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
