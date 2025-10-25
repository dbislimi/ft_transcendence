import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../../Components/SpaceBackground";
import BackgroundSurface from "../../Components/BackgroundSurface";
import LobbyList from "./LobbyList";
import { useBombPartyStore } from "../../store/useBombPartyStore";

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
	client?: any;
}

export default function LobbyScreen({ onCreate, onJoin, onBack, isAuthenticated = false, client }: LobbyScreenProps) {
	const { t } = useTranslation();
	const [tab, setTab] = useState<"create" | "join">("create");
	const { connection } = useBombPartyStore();

	// Create state
	const [name, setName] = useState("");
	const [isPrivate, setIsPrivate] = useState(false);
	const [password, setPassword] = useState("");
	const [maxPlayers, setMaxPlayers] = useState(4);


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
							{/* Indicateur de connexion */}
							<div className="flex items-center gap-2">
								<div className={`w-2 h-2 rounded-full ${
									connection.state === 'connected' ? 'bg-green-400' :
									connection.state === 'connecting' ? 'bg-yellow-400' :
									'bg-red-400'
								}`}></div>
								<span className="text-xs text-slate-400">
									{connection.state === 'connected' ? t('bombParty.lobby.connected') :
									 connection.state === 'connecting' ? t('bombParty.lobby.connecting') :
									 t('bombParty.lobby.disconnected')}
								</span>
							</div>
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

					{/* Affichage des erreurs */}
					{connection.lastError && (
						<div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 text-sm">
							{connection.lastError}
						</div>
					)}

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
								onCreate({ name, isPrivate, password: isPrivate ? password : undefined, maxPlayers });
							}}
							disabled={!name.trim() || connection.state !== 'connected' || !connection.playerId}
								className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-200 ${
									name.trim() && connection.state === 'connected' && connection.playerId
										? "bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white"
										: "bg-slate-600 text-slate-400 cursor-not-allowed"
								}`}
							>
								{connection.state !== 'connected' || !connection.playerId ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										{connection.state === 'connecting' ? t("bombParty.lobby.connecting") : t("bombParty.lobby.connectionRequired")}
									</div>
								) : (
									t("bombParty.lobby.create")
								)}
							</button>
						</div>
					) : (
						<LobbyList 
							onJoinLobby={onJoin}
							isAuthenticated={isAuthenticated}
							client={client}
						/>
					)}
				</div>
			</div>

			{/* Background picker modal removed */}
		</BackgroundSurface>
	);
}