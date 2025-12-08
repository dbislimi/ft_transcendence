import React, { memo } from "react";
import { useTranslation } from "react-i18next";

interface Props {
	opponentName: string;
}

const WaitingOverlay = memo(function WaitingOverlay({ opponentName }: Props) {
	const { t } = useTranslation();

	return (
		<div className="fixed inset-0 z-60 flex items-center justify-center pointer-events-none">
			<div className="bg-black/50 backdrop-blur-sm px-6 py-4 rounded-lg border border-white/20 shadow-lg shadow-white/8 pointer-events-auto">
				<div className="flex flex-col items-center gap-3">
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
						<span className="text-white font-semibold text-lg">
							{t("pong.waitingOverlay.waitingOpponent")}
						</span>
					</div>
					<div className="text-white/80 text-sm">
						{t("pong.waitingOverlay.waitingForOpponent")} <span className="text-white font-medium">{opponentName}</span>
					</div>
					<div className="text-white/60 text-xs">
						{t("pong.waitingOverlay.gamePaused")}
					</div>
				</div>
			</div>
		</div>
	);
});

export default WaitingOverlay;
