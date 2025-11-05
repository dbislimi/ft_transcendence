import React from "react";

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
	onContinue?: () => void;
}

export default function GameOverOverlay({
	gameOver,
	onQuit,
	onReplay,
	onContinue,
}: Props) {
	if (!gameOver) return null;

	const { didWin, scores, tournamentDepth, finalTournamentWin, opponent } =
		gameOver;

	const title = finalTournamentWin
		? "Champion du tournoi !"
		: didWin
		? "Victoire !"
		: "Défaite";
	console.log("scores: ", scores);
	const isTournament = tournamentDepth != null;
	const isTournamentRoundWin = isTournament && didWin && !finalTournamentWin;
	const isTournamentDefeat = isTournament && !didWin;

	return (
		<div className="fixed inset-0 z-60 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/60" />
			<div className="relative z-10 w-11/12 max-w-md bg-slate-900/95 border border-cyan-600/40 rounded-lg p-6 text-cyan-50 shadow-2xl">
				<div className="text-2xl font-bold mb-2">{title}</div>
				{finalTournamentWin && (
					<div className="mb-2 text-sm text-slate-200">
						Félicitations, vous avez remporté le tournoi !
					</div>
				)}
				{!finalTournamentWin && (
					<div className="mb-2 text-sm">
						{didWin
							? "Vous avez gagné cette manche."
							: "Vous avez perdu cette manche."}
					</div>
				)}

				{opponent && (
					<div className="mb-3 text-sm text-slate-300">
						Adversaire:{" "}
						<span className="font-semibold">{opponent}</span>
					</div>
				)}

				<div className="mb-4 font-mono">
					Score final: {`${scores[0]} - ${scores[1]}`}
				</div>

				<div className="flex gap-3 justify-end mt-4">
					<button
						onClick={onQuit}
						className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
					>
						Quitter
					</button>

					{!finalTournamentWin &&
						!isTournamentDefeat &&
						(isTournamentRoundWin ? (
							<button
								onClick={onContinue}
								className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
							>
								Continuer
							</button>
						) : (
							<button
								onClick={onReplay}
								className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
							>
								Rejouer
							</button>
						))}
				</div>
			</div>
		</div>
	);
}
