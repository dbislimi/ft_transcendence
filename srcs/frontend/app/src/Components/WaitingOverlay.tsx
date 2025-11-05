import React from "react";

interface Props {
	opponentName: string;
}

export default function WaitingOverlay({ opponentName }: Props) {
	return (
		<div className="fixed inset-0 z-60 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/60" />
			<div className="relative z-10 w-11/12 max-w-md bg-slate-900/95 border border-cyan-600/40 rounded-lg p-6 text-cyan-50 shadow-2xl text-center">
				<div className="text-2xl font-bold mb-4">
					En attente de l'adversaire
				</div>
				<div className="text-lg text-slate-200 mb-2">
					En attente de <span className="font-semibold text-cyan-300">{opponentName}</span>
				</div>
				<div className="text-sm text-slate-400">
					Le jeu est en pause en attendant que votre adversaire se reconnecte
				</div>
			</div>
		</div>
	);
}


