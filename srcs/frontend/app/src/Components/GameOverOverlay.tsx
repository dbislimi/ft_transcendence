import React from "react";
import { useTranslation } from "react-i18next";

type TournamentRound = { depth?: number; initialDepth?: number } | null;

interface Props {
	gameOver: {
		didWin: boolean;
		scores: number[];
		tournamentRound?: TournamentRound;
		finalTournamentWin?: boolean;
		type?: string;
	} | null;
	onQuit: () => void;
	onReplay: () => void;
	onContinue?: () => void;
}

export default function GameOverOverlay({
	gameOver,
	onQuit,
	onReplay,
	onContinue,
}: Props) {
	const { t } = useTranslation();
	if (!gameOver) return null;

	const { didWin, scores, tournamentRound, finalTournamentWin } = gameOver;

	const title = finalTournamentWin
		? t("gameOver.tournamentChampion")
		: didWin
		? t("gameOver.victory")
		: t("gameOver.defeat");

	const scoreLabel =
		Array.isArray(scores) && scores.length >= 2
			? `${scores[0]} - ${scores[1]}`
			: null;

	const isTournament =
		tournamentRound !== null && tournamentRound !== undefined;
	const isTournamentRoundWin = isTournament && didWin && !finalTournamentWin;
	const isTournamentDefeat = isTournament && !didWin;

	return (
		<div className="fixed inset-0 z-60 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/60" />
			<div className="relative z-10 w-11/12 max-w-md bg-slate-900/95 border border-cyan-600/40 rounded-lg p-6 text-cyan-50 shadow-2xl">
				<div className="text-2xl font-bold mb-2">{title}</div>
				{finalTournamentWin && (
					<div className="mb-4 text-sm text-slate-200">
						{t("gameOver.congratulations")}
					</div>
				)}
				{!finalTournamentWin && (
					<>
						<div className="mb-2 text-sm">
							{didWin
								? t("gameOver.wonRound")
								: t("gameOver.lostRound")}
						</div>
						{scoreLabel && (
							<div className="mb-4 font-mono">
								{t("gameOver.finalScore")}: {scoreLabel}
							</div>
						)}
					</>
				)}

				<div className="flex gap-3 justify-end mt-4">
					<button
						onClick={onQuit}
						className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
					>
						{t("gameOver.quit")}
					</button>

					{!finalTournamentWin &&
						!isTournamentDefeat &&
						(isTournamentRoundWin ? (
							<button
								onClick={onContinue}
								className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
							>
								{t("gameOver.continue")}
							</button>
						) : (
							<button
								onClick={onReplay}
								className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
							>
								{t("gameOver.replay")}
							</button>
						))}
				</div>
			</div>
		</div>
	);
}

