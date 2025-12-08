import React, { memo } from "react";
import { useTranslation } from "react-i18next";

interface Props {
	gameOver: {
		didWin: boolean;
		scores: number[];
		tournamentDepth?: number | null;
		finalTournamentWin?: boolean;
		type?: string;
		opponent?: string;
	} | null;
	onQuit: () => void;
	onReplay: () => void;
	onContinue: () => void;
	side: number;
}

const GameOverOverlay = memo(function GameOverOverlay({
	gameOver,
	onQuit,
	onReplay,
	onContinue,
	side,
}: Props) {
	const { t } = useTranslation();

	if (!gameOver) return null;

	const { didWin, scores, tournamentDepth, finalTournamentWin, opponent } =
		gameOver;

	const title = finalTournamentWin
		? t("pong.gameOver.tournamentChampion")
		: didWin
		? t("pong.gameOver.victoryTitle")
		: t("pong.gameOver.defeatTitle");
	// console.log("scores: ", scores);
	const isTournament = tournamentDepth != null;
	const isTournamentRoundWin = isTournament && didWin && !finalTournamentWin;
	const isTournamentDefeat = isTournament && !didWin;

	return (
		<div className="fixed inset-0 z-60 flex items-center justify-center pointer-events-none">
			<div className="bg-black/50 backdrop-blur-sm p-6 rounded-lg border border-white/20 shadow-lg shadow-white/8 max-w-md w-11/12 mx-4 pointer-events-auto">
				<div className="text-center mb-4">
					<div
						className={`text-2xl font-bold ${
							finalTournamentWin
								? "text-yellow-400"
								: didWin
								? "text-green-400"
								: "text-red-400"
						}`}
					>
						{title}
					</div>
				</div>
				{finalTournamentWin && (
					<div className="text-center mb-3 text-sm text-white/80">
						{t("pong.gameOver.congratulations")}
					</div>
				)}
				{!finalTournamentWin && (
					<div className="text-center mb-3 text-sm text-white/70">
						{didWin
							? t("pong.gameOver.wonRound")
							: t("pong.gameOver.lostRound")}
					</div>
				)}

				{opponent && (
					<div className="text-center mb-3 text-sm text-white/60">
						{t("pong.gameOver.opponent")}{" "}
						<span className="font-semibold text-white/90">{opponent}</span>
					</div>
				)}

				<div className="text-center mb-6">
					<div className="inline-block bg-white/5 border border-white/10 rounded-lg px-4 py-2">
						<div className="text-xs text-white/60 mb-1">
							{t("pong.gameOver.finalScore")}
						</div>
						<div className="text-2xl font-mono font-bold text-white">
							{`${scores[0]} - ${scores[1]}`}
						</div>
					</div>
				</div>

				<div className="flex gap-2 justify-center">
					<button
						onClick={onQuit}
						className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all border border-red-500/30 hover:border-red-500/50 text-sm font-medium"
					>
						{t("pong.gameOver.quit")}
					</button>

					{!finalTournamentWin &&
						!isTournamentDefeat &&
						(isTournamentRoundWin ? (
							<button
								onClick={onContinue}
								className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all border border-emerald-500/30 hover:border-emerald-500/50 text-sm font-medium"
							>
								{t("pong.gameOver.continue")}
							</button>
						) : (
							<button
								onClick={onReplay}
								className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all border border-emerald-500/30 hover:border-emerald-500/50 text-sm font-medium"
							>
								{t("pong.gameOver.replay")}
							</button>
						))}
				</div>
			</div>
		</div>
	);
});

export default GameOverOverlay;
