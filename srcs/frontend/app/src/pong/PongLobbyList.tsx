import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useWebSocket } from "../context/WebSocketContext";
import { useGameSettings } from "../context/GameSettingsContext";

interface PongLobbyListProps {}

interface Tournament {
	id: string;
	players: number;
	capacity: number;
	private: boolean;
}

export default function PongLobbyList({}: PongLobbyListProps) {
	const { t } = useTranslation();
	const { pongWsRef, addPongRoute, removePongRoute } = useWebSocket();
	const { settings: gameSettings } = useGameSettings();
	const [tournaments, setTournaments] = useState<Tournament[]>([]);
	const [selectedLobby, setSelectedLobby] = useState<string | null>(null);
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const sendListRequest = () => {
		if (pongWsRef.current?.readyState === WebSocket.OPEN) {
			pongWsRef.current.send(
				JSON.stringify({
					event: "tournament",
					body: { action: "list" },
				})
			);
		}
	};

	useEffect(() => {
		const handler = (d: any) => {
			if (!d) return;
			if (d.event === "tournaments") {
				setTournaments(d.body);
				setIsLoading(false);
			}
		};

		addPongRoute("pong_lobby_list", handler);

		const fetchTournaments = () => {
			sendListRequest();
		};

		fetchTournaments();

		return () => {
			removePongRoute("pong_lobby_list", handler);
		};
	}, [addPongRoute, removePongRoute, pongWsRef]);

	const handleJoinClick = (tour: Tournament) => {
		if (tour.private) {
			setSelectedLobby(tour.id);
			setPassword("");
		} else {
			pongWsRef.current?.send(
				JSON.stringify({
					event: "tournament",
					body: {
						action: "join",
						id: tour.id,
						passwd: "",
						options: gameSettings,
					},
				})
			);
		}
	};

	const handlePasswordSubmit = () => {
		if (selectedLobby && password.trim()) {
			pongWsRef.current?.send(
				JSON.stringify({
					event: "tournament",
					body: {
						action: "join",
						id: selectedLobby,
						passwd: password,
						options: gameSettings,
					},
				})
			);
			setSelectedLobby(null);
			setPassword("");
		}
	};

	const handleCancelPassword = () => {
		setSelectedLobby(null);
		setPassword("");
	};

	const handleRefresh = () => {
		setIsLoading(true);
		sendListRequest();
		setTimeout(() => setIsLoading(false), 2000);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-slate-200">
					{t("pong.lobby.availableTournaments") ||
						"Available Tournaments"}{" "}
					({tournaments.length})
				</h3>
				<button
					onClick={handleRefresh}
					disabled={isLoading}
					className="px-3 py-1 text-sm rounded border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-50"
				>
					{isLoading ? (
						<div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
					) : (
						t("pong.lobby.refresh") || "Refresh"
					)}
				</button>
			</div>

			{tournaments.length === 0 ? (
				<div className="text-center py-8">
					<p className="text-slate-400 mb-2">
						{t("pong.lobby.noTournaments") ||
							"No tournaments found"}
					</p>
					<p className="text-sm text-slate-500">
						{t("pong.lobby.noTournamentsDesc") ||
							"Create one to start playing!"}
					</p>
				</div>
			) : (
				<div className="space-y-2 max-h-96 overflow-y-auto">
					{tournaments.map((tour) => (
						<div
							key={tour.id}
							className={`p-4 rounded-lg border transition-all duration-200 ${
								tour.players >= tour.capacity
									? "border-slate-600 bg-slate-700/30 opacity-60"
									: "border-slate-600 bg-slate-700/60 hover:border-slate-500 hover:bg-slate-700/80"
							}`}
						>
							<div className="flex items-center justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<h4 className="font-medium text-slate-200">
											{tour.id}
										</h4>
										{tour.private && (
											<span className="px-2 py-1 text-xs rounded bg-purple-600/20 text-purple-300 border border-purple-500/30">
												{t("pong.lobby.private") ||
													"Private"}
											</span>
										)}
										<span
											className={`text-xs font-medium ${
												tour.players >= tour.capacity
													? "text-orange-400"
													: "text-green-400"
											}`}
										>
											{tour.players >= tour.capacity
												? t("pong.lobby.full") || "Full"
												: t("pong.lobby.waiting") ||
												  "Waiting"}
										</span>
									</div>
									<div className="flex items-center gap-4 text-sm text-slate-400">
										<span>
											{tour.players}/{tour.capacity}{" "}
											{t("pong.lobby.players") ||
												"players"}
										</span>
									</div>
								</div>
								<button
									onClick={() => handleJoinClick(tour)}
									disabled={tour.players >= tour.capacity}
									className={`px-4 py-2 rounded font-medium transition-all duration-200 ${
										tour.players >= tour.capacity
											? "bg-slate-600 text-slate-400 cursor-not-allowed"
											: "bg-linear-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white"
									}`}
								>
									{tour.players >= tour.capacity
										? t("pong.lobby.full") || "Full"
										: t("pong.lobby.join") || "Join"}
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{selectedLobby && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-slate-800 rounded-lg border border-purple-500/30 p-6 max-w-md w-full mx-4">
						<h3 className="text-lg font-semibold text-slate-200 mb-4">
							{t("pong.lobby.joinPrivate") ||
								"Join Private Tournament"}
						</h3>
						<p className="text-slate-400 mb-4">
							{t("pong.lobby.privatePasswordDesc") ||
								"This tournament is private. Please enter the password."}
						</p>
						<div className="space-y-4">
							<div>
								<label className="block text-slate-300 text-sm mb-1">
									{t("pong.lobby.password") || "Password"}
								</label>
								<input
									type="password"
									value={password}
									onChange={(e) =>
										setPassword(e.target.value)
									}
									placeholder={
										t("pong.lobby.enterPassword") ||
										"Enter password"
									}
									className="w-full px-3 py-2 rounded bg-slate-700/60 border border-slate-600 text-white"
									autoFocus
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											handlePasswordSubmit();
										} else if (e.key === "Escape") {
											handleCancelPassword();
										}
									}}
								/>
							</div>
							<div className="flex gap-2">
								<button
									onClick={handlePasswordSubmit}
									disabled={!password.trim()}
									className={`flex-1 py-2 px-4 rounded font-medium transition-all duration-200 ${
										password.trim()
											? "bg-linear-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white"
											: "bg-slate-600 text-slate-400 cursor-not-allowed"
									}`}
								>
									{t("pong.lobby.join") || "Join"}
								</button>
								<button
									onClick={handleCancelPassword}
									className="px-4 py-2 rounded border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
								>
									{t("pong.lobby.cancel") || "Cancel"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
