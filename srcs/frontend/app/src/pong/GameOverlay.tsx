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
		<div className="absolute top-6 left-1/2 -translate-x-1/2 z-80">
			<div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 shadow-lg shadow-white/8">
				<div className="flex items-center gap-2">
					{/* Mode label */}
					<span className="text-white font-medium text-sm">
						{modeLabel}
					</span>
					
					{/* Round label for tournaments */}
					{isTournamentMode && roundLabel && (
						<>
							<span className="text-white/30">•</span>
							<span className="text-white/70 text-sm">
								{roundLabel}
							</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
