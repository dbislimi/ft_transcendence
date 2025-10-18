import ActionButton from "./ActionButton";

interface WaitingSceneProps {
	onQuit: () => void;
	onTrain: () => void;
}

export default function WaitingScene({
	onQuit,
	onTrain,
}: WaitingSceneProps) {
	return (
		<div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
			<div className="w-full max-w-3xl space-y-6 rounded-2xl border border-cyan-500/20 bg-slate-900/85 p-8 shadow-2xl">
				<div className="text-center space-y-2">
					<h2 className="text-3xl font-semibold text-cyan-200">
						En attente d'un adversaire
					</h2>
					<p className="text-slate-300 text-sm sm:text-base">
						Recherche en cours... Choisissez votre prochaine action.
					</p>
				</div>
				<div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
					<ActionButton
						color="purple"
						icon={
							<span role="img" aria-label="train">
								🤖
							</span>
						}
						title="S'entrainer"
						subtitle="Choisir un bot"
						onClick={onTrain}
					/>
					<ActionButton
						color="rose"
						icon={
							<span role="img" aria-label="quit">
								🚪
							</span>
						}
						title="Quitter"
						subtitle="Revenir au menu"
						onClick={onQuit}
					/>
				</div>
			</div>
		</div>
	);
}
