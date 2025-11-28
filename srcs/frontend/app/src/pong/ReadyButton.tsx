import React from "react";
import { useTranslation } from "react-i18next";

interface ReadyButtonProps {
	remaining: number;
	selfReady: boolean;
	opponentReady: boolean;
	sessionLabels?: { self: string; opponent: string };
	onReady: () => void;
}

export function ReadyButton({
	remaining,
	selfReady,
	opponentReady,
	sessionLabels,
	onReady,
}: ReadyButtonProps) {
	const { t } = useTranslation();

	const displayOpponentName =
		sessionLabels?.opponent || t("pong.readyPhase.opponent");

	return (
		<div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
			<div className="bg-linear-to-br from-gray-900 to-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full mx-4">
				<div className="text-center mb-6">
					<div className="text-6xl font-bold text-cyan-400 mb-2 font-mono">
						{remaining}
					</div>
					<div className="text-gray-400 text-sm uppercase tracking-wider">
						{t("readyPhase.timeRemaining", "Time Remaining")}
					</div>
				</div>

				<div className="space-y-3 mb-6">
					<div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
						<div className="flex items-center gap-3">
							<div
								className={`w-3 h-3 rounded-full ${
									selfReady
										? "bg-green-500 animate-pulse"
										: "bg-gray-600"
								}`}
							/>
							<span className="text-white font-medium">
								{sessionLabels?.self ||
									t("readyPhase.you", "You")}
							</span>
						</div>
						<span
							className={`text-sm font-semibold ${
								selfReady ? "text-green-400" : "text-gray-500"
							}`}
						>
							{selfReady
								? t("readyPhase.ready", "READY")
								: t("readyPhase.notReady", "NOT READY")}
						</span>
					</div>

					<div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
						<div className="flex items-center gap-3">
							<div
								className={`w-3 h-3 rounded-full ${
									opponentReady
										? "bg-green-500 animate-pulse"
										: "bg-gray-600"
								}`}
							/>
							<span className="text-white font-medium">
								{displayOpponentName}
							</span>
						</div>
						<span
							className={`text-sm font-semibold ${
								opponentReady
									? "text-green-400"
									: "text-gray-500"
							}`}
						>
							{opponentReady
								? t("readyPhase.ready", "READY")
								: t("readyPhase.notReady", "NOT READY")}
						</span>
					</div>
				</div>

				{!selfReady && (
					<button
						onClick={onReady}
						className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-lg rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-cyan-500/50"
					>
						{t("readyPhase.imReady", "I'M READY!")}
					</button>
				)}

				{selfReady && (
					<div className="text-center py-4 text-gray-400">
						{opponentReady
							? t(
									"readyPhase.bothReady",
									"Both players ready! Starting soon..."
							  )
							: t(
									"readyPhase.waitingOpponent",
									"Waiting for opponent..."
							  )}
					</div>
				)}

				<div className="mt-4 text-xs text-gray-500 text-center">
					{t(
						"readyPhase.info",
						"The game will start automatically when both players are ready or when the timer expires."
					)}
				</div>
			</div>
		</div>
	);
}