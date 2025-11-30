import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import SpaceBackground from "../Components/SpaceBackground";
import BackgroundSurface from "../Components/BackgroundSurface";
import PongLobbyList from "./PongLobbyList";
import PlayersCountDropdown from "../game-bomb-party/ui/PlayersCountDropdown";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useUser } from "../contexts/UserContext";
import { useGameSettings } from "../contexts/GameSettingsContext";

interface PongTournamentLobbyProps {
	onBack?: () => void;
}

export default function PongTournamentLobby({
	onBack,
}: PongTournamentLobbyProps) {
	const { t } = useTranslation();
	const { pongWsRef } = useWebSocket();
	const { isAuthenticated } = useUser();
	const { settings: gameSettings } = useGameSettings();
	const [tab, setTab] = useState<"create" | "join">("create");
	const [name, setName] = useState("");
	const [isPrivate, setIsPrivate] = useState(false);
	const [password, setPassword] = useState("");
	const [maxPlayers, setMaxPlayers] = useState(4);

	const isConnected = pongWsRef.current?.readyState === WebSocket.OPEN;

	return (
		<BackgroundSurface game="pong">
			<SpaceBackground />
			<div className="min-h-screen flex items-center justify-center p-6">
				<div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-purple-500/30 p-8 max-w-2xl w-full shadow-2xl">
					<div className="flex items-center justify-between mb-6">
						<h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
							{t("pong.lobby.title") || "Tournament Lobby"}
						</h1>
						<div className="flex items-center gap-2">
							<div className="flex items-center gap-2">
								<div
									className={`w-2 h-2 rounded-full ${
										isConnected
											? "bg-green-400"
											: "bg-red-400"
									}`}
								></div>
								<span className="text-xs text-slate-400">
									{isConnected
										? t("pong.lobby.connected") ||
										  "Connected"
										: t("pong.lobby.disconnected") ||
										  "Disconnected"}
								</span>
							</div>
							{onBack && (
								<button
									type="button"
									onClick={onBack}
									className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:text-white"
									aria-label={t("common.back") || "Back"}
								>
									{t("common.back") || "Back"}
								</button>
							)}
						</div>
					</div>

					<div className="flex gap-2 mb-4">
						<button
							type="button"
							onClick={() => setTab("create")}
							className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
								tab === "create"
									? "border-cyan-400 text-cyan-300 bg-cyan-400/10"
									: "border-slate-600 text-slate-400 hover:border-slate-500"
							}`}
						>
							{t("pong.lobby.createTab") || "Create Tournament"}
						</button>
						<button
							type="button"
							onClick={() => setTab("join")}
							className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
								tab === "join"
									? "border-cyan-400 text-cyan-300 bg-cyan-400/10"
									: "border-slate-600 text-slate-400 hover:border-slate-500"
							}`}
						>
							{t("pong.lobby.joinTab") || "Join Tournament"}
						</button>
					</div>

					{tab === "create" ? (
						<div className="space-y-4">
							<div>
								<label className="block text-slate-300 text-sm mb-1">
									{t("pong.lobby.name") || "Tournament Name"}
								</label>
								<input
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white focus:outline-none focus:border-cyan-400 transition-colors"
									placeholder={
										t("pong.lobby.namePlaceholder") ||
										"Enter tournament name"
									}
								/>
							</div>

							<PlayersCountDropdown
								value={maxPlayers}
								onChange={setMaxPlayers}
								options={[4, 8, 16]}
								label={
									t("pong.lobby.playersCount") ||
									"Max Players"
								}
							/>

							<div className="flex items-center gap-2">
								<input
									id="isPrivate"
									type="checkbox"
									checked={isPrivate}
									onChange={(e) =>
										setIsPrivate(e.target.checked)
									}
									className="w-4 h-4 rounded border-slate-600 bg-slate-700/60 text-cyan-500 focus:ring-cyan-400"
								/>
								<label
									htmlFor="isPrivate"
									className="text-slate-300 cursor-pointer"
								>
									{t("pong.lobby.private") ||
										"Private Tournament"}
								</label>
							</div>

							{isPrivate && (
								<div>
									<label className="block text-slate-300 text-sm mb-1">
										{t("pong.lobby.passwordOpt") ||
											"Password (Optional)"}
									</label>
									<input
										type="password"
										value={password}
										onChange={(e) =>
											setPassword(e.target.value)
										}
										className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white focus:outline-none focus:border-cyan-400 transition-colors"
										placeholder={
											t(
												"pong.lobby.passwordPlaceholder"
											) || "Enter password"
										}
									/>
								</div>
							)}

							<button
								type="button"
								onClick={() => {
									pongWsRef.current?.send(
										JSON.stringify({
											event: "tournament",
											body: {
												action: "create",
												id: name,
												size: maxPlayers,
												passwd: password || "",
												options: gameSettings,
											},
										})
									);
								}}
								disabled={!name.trim() || !isConnected}
								className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-200 ${
									name.trim() && isConnected
										? "bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl"
										: "bg-slate-600 text-slate-400 cursor-not-allowed"
								}`}
							>
								{!isConnected ? (
									<div className="flex items-center justify-center gap-2">
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										{t("pong.lobby.connecting") ||
											"Connecting..."}
									</div>
								) : (
									t("pong.lobby.create") ||
									"Create Tournament"
								)}
							</button>
						</div>
					) : (
						<PongLobbyList />
					)}
				</div>
			</div>
		</BackgroundSurface>
	);
}
