import { useTranslation } from "react-i18next";
import GameCard from "./GameCard";
import ChoiceGroup from "./ChoiceGroup";
import { useState } from "react";
import GameInput from "./GameInput";
interface OnlineCardProps {
	onCancel: () => void;
	onConfirm: (
		gamemode: string,
		type: string,
		size: number,
		id: string,
		passwd: string,
	) => void;
}

export function OnlineCard({ onCancel, onConfirm }: OnlineCardProps) {
	const { t } = useTranslation();

	const [gamemode, setGamemode] = useState<string>("Quick Match");
	const [type, setType] = useState<string>("Create");
	const [size, setSize] = useState<number>(4);
	const [name, setName] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const [isPrivate, setIsPrivate] = useState(false);

	const disableConfirm =
		type === "Create"
			? (!isPrivate && !name.trim()) ||
			  (isPrivate && (!name.trim() || !password.trim()))
			: !name.trim();

	return (
		<div className="absolute inset-0 flex items-center justify-center p-4">
			<GameCard
				title="Online Mode"
				onCancel={onCancel}
				onConfirm={() =>
					onConfirm(
						gamemode,
						type,
						size,
						name,
						password,
					)
				}
				disabledConfirm={gamemode !== "Quick Match" ? disableConfirm: false}
			>
				<div className="space-y-6">
					<ChoiceGroup
						label="Mode"
						options={["Tournament", "Quick Match"]}
						value={gamemode}
						onChange={(val) => setGamemode(val)}
						columns={2}
						color="cyan"
						variant="lg"
					/>
					{gamemode === "Tournament" && (
						<>
							<ChoiceGroup
								options={["Create", "Join"]}
								value={type}
								onChange={(val) => setType(val)}
								columns={2}
								color="cyan"
								variant="md"
							/>
							{type === "Create" && (
								<ChoiceGroup
									options={[4, 8, 16, 32]}
									value={size}
									onChange={(val) => setSize(val)}
									columns={4}
									color="cyan"
									variant="sm"
								/>
							)}
							<GameInput
								name={name}
								onNameChange={setName}
								isPrivate={isPrivate}
								onIsPrivateChange={setIsPrivate}
								password={password}
								onPasswordChange={setPassword}
								labels={{
									name: t("bombParty.lobby.name"),
									private: t("bombParty.lobby.private"),
									password: t("bombParty.lobby.password"),
								}}
							/>
						</>
					)}
				</div>
			</GameCard>
		</div>
	);
}
