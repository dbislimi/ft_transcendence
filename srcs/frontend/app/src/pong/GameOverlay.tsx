import React from "react";
import { useTranslation } from "react-i18next";

interface Props {
	play: boolean;
	sessionType?: "offline" | "online" | null;
	tournamentDepth?: number | null;
	isTournament?: boolean;
}

export default function GameOverlay({
	play,
	sessionType,
	tournamentDepth,
	isTournament,
}: Props) {
	const { t } = useTranslation();
	if (!play) return null;

	const isTournamentMode = isTournament || tournamentDepth != null;
	const modeLabel =
		sessionType === "offline"
			? "Hors-ligne"
			: isTournamentMode
			? "Tournoi"
			: t('common.online');

	const renderRoundLabel = () => {
		const d = tournamentDepth;
		if (d === undefined || d === null) return null;
		if (d === 1) return "Finale";
		if (d === 2) return "Demi-finale";
		if (d === 3) return "Quart de finale";
		return `${2 ** d}eme de finale`;
	};

	const roundLabel = renderRoundLabel();

	return (
		<div className="absolute top-4 right-4 z-80">
			<div className="px-3 py-2 bg-slate-900/90 border border-cyan-600/40 rounded-md text-xs text-cyan-100 shadow-lg">
				<div className="font-semibold">Mode</div>
				<div className="mt-1">{modeLabel}</div>
				{isTournamentMode && roundLabel && (
					<div className="mt-2 text-xs text-slate-200">
						{roundLabel}
					</div>
				)}
			</div>
		</div>
	);
}
