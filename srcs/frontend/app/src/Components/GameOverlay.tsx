import React from "react";

type TournamentRound = { depth?: number; initialDepth?: number } | null;

interface Props {
	play: boolean;
	sessionType?: "offline" | "online" | null;
	tournamentRound?: TournamentRound;
}

export default function GameOverlay({
	play,
	sessionType,
	tournamentRound,
}: Props) {
	if (!play) return null;

	const isTournament = !!tournamentRound;
	const modeLabel =
		sessionType === "offline"
			? "Hors-ligne"
			: isTournament
			? "Tournoi"
			: "En ligne";

	const renderRoundLabel = () => {
		const d = tournamentRound?.depth;
		if (d === undefined || d === null) return null;
		if (d === 1) return "Finale";
		if (d === 2) return "Demi-finale";
		if (d === 3) return "Quart de finale";
		if (typeof d === "number") return `${2 ** d}eme de finale`;
		return null;
	};

	const roundLabel = renderRoundLabel();

	return (
		<div className="absolute top-4 right-4 z-50">
			<div className="px-3 py-2 bg-slate-900/90 border border-cyan-600/40 rounded-md text-xs text-cyan-100 shadow-lg">
				<div className="font-semibold">Mode</div>
				<div className="mt-1">{modeLabel}</div>
				{isTournament && roundLabel && (
					<div className="mt-2 text-xs text-slate-200">
						{roundLabel}
					</div>
				)}
			</div>
		</div>
	);
}

