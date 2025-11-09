import { useTranslation } from "react-i18next";
import GameCard from "./GameCard";
import ChoiceGroup from "./ChoiceGroup";
import GameInput from "./GameInput";
import { useEffect, useState, type RefObject } from "react";
import { useWebSocket } from "../context/WebSocketContext";

interface OnlineCardProps {
	onCancel: () => void;
	onConfirm: (
		gamemode: string,
		type: string,
		size: number,
		id: string,
		passwd: string
	) => void;
}

interface Tournament {
	id: string;
	players: number;
	capacity: number;
	private: boolean;
}

export function OnlineCard({ onCancel, onConfirm }: OnlineCardProps) {
	const { t } = useTranslation();
	const [mode, setMode] = useState("Quick Match");
	const [variant, setVariant] = useState("Join");
	const [size, setSize] = useState(4);
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [priv, setPriv] = useState(false);
	const [tournaments, setTournaments] = useState<Tournament[]>([]);

	const { pongWsRef, addPongRoute, removePongRoute } = useWebSocket();

	useEffect(() => {
		if (mode !== "Tournament" || variant !== "Join") return;
		const handler = (d: any) => {
			if (!d) return;
			if (d.event === "tournaments") setTournaments(d.body);
		};

		addPongRoute("online_card", handler);

		const ask = () => {
			if (pongWsRef.current?.readyState === WebSocket.OPEN)
				pongWsRef.current.send(
					JSON.stringify({
						event: "tournament",
						body: { action: "list" },
					})
				);
		};
		ask();
		const id = setInterval(ask, 3000);
		return () => {
			clearInterval(id);
			removePongRoute("online_card", handler);
		};
	}, [mode, variant, addPongRoute, removePongRoute, pongWsRef]);

	const disable =
		variant === "Create"
			? (!priv && !name.trim()) ||
			  (priv && (!name.trim() || !password.trim()))
			: priv
			? !name.trim() || !password.trim()
			: !name.trim();

	const onSubmit = () => onConfirm(mode, variant, size, name, password);

	return (
		<div className="absolute inset-0 flex items-center justify-center p-4">
			<GameCard
				title="Online Mode"
				onCancel={onCancel}
				onConfirm={onSubmit}
				disabledConfirm={mode !== "Quick Match" ? disable : false}
			>
				<div className="space-y-5">
					<ChoiceGroup
						label="Mode"
						options={["Tournament", "Quick Match"]}
						value={mode}
						onChange={setMode}
						columns={2}
						color="cyan"
						variant="lg"
					/>
					{mode === "Tournament" && (
						<div className="space-y-4">
							<ChoiceGroup
								options={["Create", "Join"]}
								value={variant}
								onChange={setVariant}
								columns={2}
								color="cyan"
								variant="md"
							/>
							{variant === "Create" && (
								<div className="space-y-4">
									<ChoiceGroup
										label="Capacite"
										options={[4, 8, 16, 32]}
										value={size}
										onChange={setSize}
										columns={4}
										color="cyan"
										variant="sm"
									/>
									<GameInput
										name={name}
										onNameChange={setName}
										isPrivate={priv}
										onIsPrivateChange={setPriv}
										password={password}
										onPasswordChange={setPassword}
										labels={{
											name: t("bombParty.lobby.name"),
											private: t(
												"bombParty.lobby.private"
											),
											password: t(
												"bombParty.lobby.password"
											),
										}}
									/>
								</div>
							)}
							{variant === "Join" && (
								<div className="max-h-60 overflow-y-auto space-y-2 p-2 rounded-md bg-slate-900/75 border border-cyan-600/30">
									{tournaments.length === 0 && (
										<div className="text-xs text-slate-400 italic text-center">
											No tournaments
										</div>
									)}
									{tournaments.map((tour) => {
										const selected = name === tour.id;
										const needsPwd =
											selected && tour.private;
										return (
											<div
												key={tour.id}
												className="flex gap-2 w-full min-w-0"
											>
												<button
													onClick={() => {
														setName(tour.id);
														setPriv(tour.private);
														if (
															tour.private &&
															!selected
														)
															setPassword("");
													}}
													className={`flex flex-col justify-center px-3 py-2 rounded border text-left text-xs min-w-0 flex-1 ${
														selected
															? "bg-cyan-600/25 border-cyan-400"
															: "bg-slate-800 border-slate-600 hover:border-cyan-500"
													}`}
												>
													<div className="flex items-center gap-2 min-w-0">
														<span className="truncate font-mono text-xs text-cyan-200 font-semibold">
															{tour.id}
														</span>
														<div className="ml-auto flex items-center gap-1">
															{tour.private && (
																<span>🔒</span>
															)}
															<span className="text-xs text-cyan-200 font-semibold">
																{tour.players}/
																{tour.capacity}
															</span>
														</div>
													</div>
													<div className="mt-1 h-1 w-full bg-slate-700 rounded overflow-hidden">
														<div
															className="h-full bg-cyan-400"
															style={{
																width: `${
																	(tour.players /
																		tour.capacity) *
																	100
																}%`,
															}}
														/>
													</div>
												</button>
												{needsPwd && (
													<input
														type="password"
														placeholder={t(
															"bombParty.lobby.password"
														)}
														value={password}
														onChange={(e) =>
															setPassword(
																e.target.value
															)
														}
														className="w-32 px-2 py-2 rounded border border-cyan-500/40 bg-slate-800 text-xs text-white focus:outline-none focus:border-cyan-300"
														autoFocus
													/>
												)}
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}
				</div>
			</GameCard>
		</div>
	);
}
