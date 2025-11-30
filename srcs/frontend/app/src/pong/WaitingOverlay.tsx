import React from "react";
import { useTranslation } from "react-i18next";

interface Props {
	opponentName: string;
}

export default function WaitingOverlay({ opponentName }: Props) {
	const { t } = useTranslation();

	return (
		<div className="fixed inset-0 z-60 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/60" />
			<div className="relative z-10 w-11/12 max-w-md bg-slate-900/95 border border-cyan-600/40 rounded-lg p-6 text-cyan-50 shadow-2xl text-center">
				<div className="text-2xl font-bold mb-4">
					{t("pong.waitingOverlay.waitingOpponent")}
				</div>
				<div className="text-lg text-slate-200 mb-2">
					{t("pong.waitingOverlay.waitingForOpponent") + opponentName}
				</div>
				<div className="text-sm text-slate-400">
					{t("pong.waitingOverlay.gamePaused")}
				</div>
			</div>
		</div>
	);
}
