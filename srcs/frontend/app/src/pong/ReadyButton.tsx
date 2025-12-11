import React from "react";
import { useTranslation } from "react-i18next";

interface ReadyButtonProps {
	remaining: number;
	selfReady: boolean;
	opponentReady: boolean;
	sessionLabels?: { self: string; opponent: string };
	onReady: () => void;
}

export const ReadyButton = React.memo(function ReadyButton({
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
		<div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
			<div className="bg-black/50 backdrop-blur-sm p-6 rounded-lg border border-white/20 shadow-lg shadow-white/8 max-w-md w-full mx-4 pointer-events-auto">
				<div className="text-center mb-6">
					<div className="text-5xl font-bold text-white mb-2 font-mono">
						{remaining}
					</div>
					<div className="text-white/60 text-xs uppercase tracking-wider">
						{t("pong.readyPhase.timeRemaining", "Time Remaining")}
					</div>
				</div>

				<div className="space-y-2 mb-6">
					<div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
						<div className="flex items-center gap-2">
							<div
								className={`w-2 h-2 rounded-full ${
									selfReady
										? "bg-green-400 animate-pulse"
										: "bg-white/30"
								}`}
							/>
							<span className="text-white/90 text-sm font-medium">
								{sessionLabels?.self ||
									t("pong.readyPhase.you", "You")}
							</span>
						</div>
						<span
							className={`text-xs font-semibold ${
								selfReady ? "text-green-400" : "text-white/50"
							}`}
						>
							{selfReady
								? t("pong.readyPhase.ready", "READY")
								: t("pong.readyPhase.notReady", "NOT READY")}
						</span>
					</div>

					<div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
						<div className="flex items-center gap-2">
							<div
								className={`w-2 h-2 rounded-full ${
									opponentReady
										? "bg-green-400 animate-pulse"
										: "bg-white/30"
								}`}
							/>
							<span className="text-white/90 text-sm font-medium">
								{displayOpponentName}
							</span>
						</div>
						<span
							className={`text-xs font-semibold ${
								opponentReady
									? "text-green-400"
									: "text-white/50"
							}`}
						>
							{opponentReady
								? t("pong.readyPhase.ready", "READY")
								: t("pong.readyPhase.notReady", "NOT READY")}
						</span>
					</div>
				</div>

				{!selfReady && (
					<button
						onClick={onReady}
						className="w-full py-3 px-6 bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-300 font-semibold rounded-lg transition-all duration-200 border border-emerald-500/40 hover:border-emerald-500/60"
					>
						{t("pong.readyPhase.imReady", "I'M READY!")}
					</button>
				)}

				{selfReady && (
					<div className="text-center py-3 text-white/60 text-sm">
						{opponentReady
							? t(
									"pong.readyPhase.bothReady",
									"Both players ready! Starting soon..."
							  )
							: t(
									"pong.readyPhase.waitingOpponent",
									"Waiting for opponent..."
							  )}
					</div>
				)}

				<div className="mt-4 text-xs text-white/40 text-center">
					{t(
						"pong.readyPhase.info",
						"The game will start automatically when both players are ready or when the timer expires."
					)}
				</div>
			</div>
		</div>
	);
});
