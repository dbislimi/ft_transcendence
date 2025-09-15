import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../../Components/SpaceBackground";
import BackgroundSurface from "../../Components/BackgroundSurface";
import BackgroundPicker from "../../Components/BackgroundPicker";
import GameCard from "../../Components/GameCard";
import ChoiceGroup from "../../Components/ChoiceGroup";

interface LobbyMeta {
	name: string;
	isPrivate: boolean;
	password?: string;
}

interface LobbyScreenProps {
	onCreate: (data: LobbyMeta) => void;
	onJoin: (name: string, password?: string) => void;
	onBack?: () => void;
}

export default function LobbyScreen({
	onCreate,
	onJoin,
	onBack,
}: LobbyScreenProps) {
	const { t } = useTranslation();
	const [tab, setTab] = useState<"create" | "join">("create");
	const [openPicker, setOpenPicker] = useState(false);

	// Create state
	const [name, setName] = useState("");
	const [isPrivate, setIsPrivate] = useState(false);
	const [password, setPassword] = useState("");
	// player limit moved to Players screen

	// Join state
	const [joinName, setJoinName] = useState("");
	const [joinPassword, setJoinPassword] = useState("");

	return (
		<BackgroundSurface game="bombparty">
			<SpaceBackground />
			<div className="min-h-screen flex items-center justify-center p-6">
				<div className="max-w-2xl w-full">
					<GameCard
						title={t("bombParty.lobby.title")}
						subtitle={undefined}
						cancelLabel={t("common.back")}
						onCancel={onBack}
						disabledConfirm={
							tab === "create"
								? !name.trim() ||
								  (isPrivate && !password.trim())
								: !joinName.trim()
						}
						confirmLabel={
							tab === "create"
								? t("bombParty.lobby.create")
								: t("bombParty.lobby.join")
						}
						onConfirm={
							tab === "create"
								? () =>
										onCreate({
											name,
											isPrivate,
											password: isPrivate
												? password
												: undefined,
										})
								: () =>
										onJoin(
											joinName,
											joinPassword || undefined
										)
						}
					>
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setOpenPicker(true)}
									className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-white"
									aria-label={t("ui.background.openAria")}
								>
									{t("ui.background.open")}
								</button>
							</div>
						</div>
						<div className="mb-6">
							<ChoiceGroup
								options={[
									{
										value: "create",
										label: t("bombParty.lobby.createTab"),
									},
									{
										value: "join",
										label: t("bombParty.lobby.joinTab"),
									},
								]}
								value={tab}
								onChange={(val) =>
									setTab(val as "create" | "join")
								}
								columns={2}
								color="cyan"
								variant="md"
							/>
						</div>
						{tab === "create" ? (
							<div className="space-y-4">
								<div>
									<label className="block text-slate-300 text-sm mb-1">
										{t("bombParty.lobby.name")}
									</label>
									<input
										value={name}
										onChange={(e) =>
											setName(e.target.value)
										}
										className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
									/>
								</div>
								<div className="flex items-center gap-2">
									<input
										id="isPrivate"
										type="checkbox"
										checked={isPrivate}
										onChange={(e) =>
											setIsPrivate(e.target.checked)
										}
									/>
									<label
										htmlFor="isPrivate"
										className="text-slate-300"
									>
										{t("bombParty.lobby.private")}
									</label>
								</div>
								{isPrivate && (
									<div>
										<label className="block text-slate-300 text-sm mb-1">
											{t("bombParty.lobby.password")}
										</label>
										<input
											type="password"
											value={password}
											onChange={(e) =>
												setPassword(e.target.value)
											}
											className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
										/>
									</div>
								)}
							</div>
						) : (
							<div className="space-y-4">
								<div>
									<label className="block text-slate-300 text-sm mb-1">
										{t("bombParty.lobby.name")}
									</label>
									<input
										value={joinName}
										onChange={(e) =>
											setJoinName(e.target.value)
										}
										className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
									/>
								</div>
								<div>
									<label className="block text-slate-300 text-sm mb-1">
										{t("bombParty.lobby.passwordOpt")}
									</label>
									<input
										type="password"
										value={joinPassword}
										onChange={(e) =>
											setJoinPassword(e.target.value)
										}
										className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
									/>
								</div>
								{/* Join action handled by GameCard confirm button; legacy button removed */}
							</div>
						)}
					</GameCard>
				</div>
			</div>

			{openPicker && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-slate-800 rounded-2xl p-6 max-w-3xl w-full mx-4">
						<h3 className="text-xl font-bold text-white mb-4">
							{t("ui.background.title")}
						</h3>
						<BackgroundPicker game="bombparty" />
						<button
							onClick={() => setOpenPicker(false)}
							className="mt-6 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
						>
							{t("common.close")}
						</button>
					</div>
				</div>
			)}
		</BackgroundSurface>
	);
}
