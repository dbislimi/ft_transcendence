import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../../Components/SpaceBackground";
import BackgroundSurface from "../../Components/BackgroundSurface";

interface LobbyMeta {
	name: string;
	isPrivate: boolean;
	password?: string;
	maxPlayers: number;
}

interface LobbyScreenProps {
	onCreate: (data: LobbyMeta) => void;
	onJoin: (name: string, password?: string) => void;
	onBack?: () => void;
	isAuthenticated?: boolean;
}

export default function LobbyScreen({ onCreate, onJoin, onBack, isAuthenticated = false }: LobbyScreenProps) {
	const { t } = useTranslation();
	const [tab, setTab] = useState<"create" | "join">("create");

	// Create state
	const [name, setName] = useState("");
	const [isPrivate, setIsPrivate] = useState(false);
	const [password, setPassword] = useState("");
	const [maxPlayers, setMaxPlayers] = useState(4);

	// Join state
	const [joinName, setJoinName] = useState("");
	const [joinPassword, setJoinPassword] = useState("");

	return (
		<BackgroundSurface game="bombparty">
		<SpaceBackground />
			<div className="min-h-screen flex items-center justify-center p-6">
				<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-2xl w-full shadow-2xl">
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
							{t("bombParty.lobby.title")}
						</h1>
						<div className="flex items-center gap-2">
						{onBack && (
							<button
								type="button"
								onClick={onBack}
								className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-white"
								aria-label={t('common.backAria')}
							>
								{t("common.back")}
							</button>
						)}
						</div>
					</div>

					<div className="flex gap-2 mb-4">
						<button
							type="button"
							onClick={() => setTab("create")}
							className={`px-4 py-2 rounded-lg border ${tab === "create" ? "border-cyan-400 text-cyan-300" : "border-slate-600 text-slate-400"}`}
						>
							{t("bombParty.lobby.createTab")}
						</button>
						<button
							type="button"
							onClick={() => setTab("join")}
							className={`px-4 py-2 rounded-lg border ${tab === "join" ? "border-cyan-400 text-cyan-300" : "border-slate-600 text-slate-400"}`}
						>
							{t("bombParty.lobby.joinTab")}
						</button>
					</div>

					{tab === "create" ? (
						<div className="space-y-4">
							<div>
								<label className="block text-slate-300 text-sm mb-1">{t("bombParty.lobby.name")}</label>
								<input
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
								/>
							</div>
							<div>
								<label className="block text-slate-300 text-sm mb-2">{t("bombParty.lobby.playersCount")}</label>
								<select
									value={maxPlayers}
									onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
									className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
								>
									<option value={2}>2 joueurs</option>
									<option value={3}>3 joueurs</option>
									<option value={4}>4 joueurs</option>
									<option value={6}>6 joueurs</option>
									<option value={8}>8 joueurs</option>
									<option value={10}>10 joueurs</option>
									<option value={12}>12 joueurs</option>
								</select>
							</div>
							<div className="flex items-center gap-2">
								<input
									id="isPrivate"
									type="checkbox"
									checked={isPrivate}
									onChange={(e) => setIsPrivate(e.target.checked)}
								/>
								<label htmlFor="isPrivate" className="text-slate-300">{t("bombParty.lobby.private")}</label>
							</div>
							{isPrivate && (
								<div>
									<label className="block text-slate-300 text-sm mb-1">{t("bombParty.lobby.password")}</label>
									<input
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
									/>
								</div>
							)}
						<button
							type="button"
							onClick={() => {
								console.log('[Frontend-LobbyScreen] Création lobby avec maxPlayers:', maxPlayers);
								onCreate({ name, isPrivate, password: isPrivate ? password : undefined, maxPlayers });
							}}
							disabled={!name.trim() || !isAuthenticated}
								className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-200 ${
									name.trim() && isAuthenticated
										? "bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white"
										: "bg-slate-600 text-slate-400 cursor-not-allowed"
								}`}
							>
								{!isAuthenticated ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										{t("bombParty.lobby.connecting")}
									</div>
								) : (
									t("bombParty.lobby.create")
								)}
							</button>
						</div>
					) : (
						<div className="space-y-4">
							<div>
								<label className="block text-slate-300 text-sm mb-1">{t("bombParty.lobby.lobbyId")}</label>
								<input
									value={joinName}
									onChange={(e) => setJoinName(e.target.value)}
									placeholder={t("bombParty.lobby.lobbyIdPlaceholder")}
									className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
								/>
								<p className="text-xs text-slate-400 mt-1">
									{t("bombParty.lobby.lobbyIdHelp")}
								</p>
							</div>
							<div>
								<label className="block text-slate-300 text-sm mb-1">{t("bombParty.lobby.lobbyId")}</label>
								<input
									type="password"
									value={joinPassword}
									onChange={(e) => setJoinPassword(e.target.value)}
									placeholder={t("bombParty.lobby.passwordPlaceholder")}
									className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
								/>
							</div>
							<button
								type="button"
								onClick={() => onJoin(joinName, joinPassword || undefined)}
								disabled={!joinName.trim() || !isAuthenticated}
								className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-200 ${
									joinName.trim() && isAuthenticated
										? "bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white"
										: "bg-slate-600 text-slate-400 cursor-not-allowed"
								}`}
							>
								{!isAuthenticated ? t("bombParty.lobby.connecting") : t("bombParty.lobby.join")}
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Background picker modal removed */}
		</BackgroundSurface>
	);
}