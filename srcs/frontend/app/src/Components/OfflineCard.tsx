import GameCard from "./GameCard";
import ChoiceGroup from "./ChoiceGroup";
import { useState } from "react";

interface OfflineCardProps {
	onCancel: () => void;
	onConfirm: (cfg: { players: number; botDifficulty?: string }) => void;
}

export function OfflineCard({ onCancel, onConfirm }: OfflineCardProps) {
	const [players, setPlayers] = useState<number | null>(null);
	const [botDifficulty, setBotDifficulty] = useState<string | null>(null);

	const disabled =
		players === null || (players === 1 && botDifficulty === null);

	return (
		<div className="absolute inset-0 flex items-center justify-center p-4">
			<GameCard
				title="Offline Mode"
				onCancel={() => {
					onCancel();
					setPlayers(null);
					setBotDifficulty(null);
				}}
				onConfirm={() => {
					onConfirm({
						players: players!,
						...(players === 1 && {
							botDifficulty: botDifficulty || undefined,
						}),
					});
					setPlayers(null);
					setBotDifficulty(null);
				}}
				disabledConfirm={disabled}
			>
				<div className="space-y-6">
					<ChoiceGroup
						label="Players"
						options={[
							{ value: 1, label: "1 Player" },
							{ value: 2, label: "2 Players" },
						]}
						value={players}
						onChange={(val) => {
							const num = val as number;
							setPlayers(num);
							if (num === 2) setBotDifficulty(null);
						}}
						columns={2}
						color="cyan"
						variant="lg"
					/>
					{players === 1 && (
						<ChoiceGroup
							label="Bot Difficulty"
							options={["easy", "medium", "hard"].map((v) => ({
								value: v,
								label: v,
							}))}
							value={botDifficulty || ""}
							onChange={(val) => setBotDifficulty(val as string)}
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
