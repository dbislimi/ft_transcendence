import GameCard from "./GameCard";
import ChoiceGroup from "./ChoiceGroup";
import { useEffect, useState } from "react";
import type { Difficulty } from "../hooks/usePongParams";
interface OnlineCardProps {
	onCancel: () => void;
	onConfirm: (cfg: { gamemode: string; type?: string }) => void;
}

export function OnlineCard({ onCancel, onConfirm }: OnlineCardProps) {
	const [gamemode, setGamemode] = useState<string>("solo");
	const [type, setType] = useState<string>("Create");

	return (
		<div className="absolute inset-0 flex items-center justify-center p-4">
			<GameCard
				title="Online Mode"
				onCancel={onCancel}
				onConfirm={() => onConfirm({ gamemode: gamemode, type: type })}
			>
				<div className="space-y-6">
					<ChoiceGroup
						label="Mode"
						options={[
							{ value: "Tournament", label: "Tournament" },
							{ value: "Quick Match", label: "Quick Match" },
						]}
						value={gamemode}
						onChange={(val) => setGamemode(val)}
						columns={2}
						color="cyan"
						variant="lg"
					/>
					{gamemode === "Tournament" && (
						<ChoiceGroup
							options={[
								{ value: "Create", label: "Create" },
								{ value: "Join", label: "Join" },
							]}
							value={type}
							onChange={(val) => setType(val)}
							columns={2}
							color="cyan"
							variant="md"
						/>
					)}
				</div>
			</GameCard>
		</div>
	);
}
