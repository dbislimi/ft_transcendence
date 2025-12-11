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
			? t("pong.gameOverlay.offline")
			: isTournamentMode
			? t("pong.gameOverlay.tournament")
			: t("common.online");

	const renderRoundLabel = () => {
		const d = tournamentDepth;
		if (d === undefined || d === null) return null;
		if (d === 1) return t("pong.gameOverlay.final");
		if (d === 2) return t("pong.gameOverlay.semiFinal");
		if (d === 3) return t("pong.gameOverlay.quarterFinal");
		return t("pong.gameOverlay.roundOf", { count: 2 ** d });
	};

	const roundLabel = renderRoundLabel();

	return (
		<div className="absolute top-6 left-1/2 -translate-x-1/2 z-80">
			<div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 shadow-lg shadow-white/8">
				<div className="flex items-center gap-2">
					<span className="text-white font-medium text-sm">
						{modeLabel}
					</span>

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
