import { useCallback, useState } from "react";

type Difficulty = "easy" | "medium" | "hard";

type Props = {
	onQuit: () => void;
	onTrain: (difficulty: Difficulty) => void;
	training?: boolean;
	onQuitTraining?: () => void;
};

export default function WaitingOverlay({
	onQuit,
	onTrain,
	training = false,
	onQuitTraining,
}: Props) {
	const [difficulty, setDifficulty] = useState<Difficulty>("easy");

	const handleTrain = useCallback(() => {
		onTrain(difficulty);
	}, [difficulty, onTrain]);

	const containerClass =
		"fixed inset-0 z-50 flex items-center justify-center pointer-events-none";
	const cardPositionClass = training
		? "-translate-y-24 mt-6"
		: "translate-y-0 mt-0";
	const cardPaddingClass = training ? "py-3 px-4" : "py-6 px-6";
	const titleSizeClass = training ? "text-lg" : "text-2xl sm:text-3xl";
	const dotsMarginClass = training ? "ml-2" : "ml-3";
	const dotSizeClass = training ? "w-1.5 h-1.5 mr-2" : "w-2 h-2 mr-2";
	const dotLastClass = training ? "w-1.5 h-1.5 mr-0" : "w-2 h-2 mr-0";

	return (
		<div className={containerClass}>
			{!training && <div className="absolute inset-0 bg-black/40" />}

			<div
				className={
					"relative z-10 w-full max-w-xl mx-4 pointer-events-auto transition-all duration-300 ease-out " +
					cardPositionClass
				}
			>
				<div
					className={
						"mx-auto p-6 rounded-lg bg-white/6 border border-white/10 text-white backdrop-blur-sm shadow-lg text-center " +
						cardPaddingClass
					}
				>
					<h2
						className={
							titleSizeClass +
							" font-semibold inline-flex items-center justify-center"
						}
					>
						En attente d'un adversaire
						<span
							className={
								dotsMarginClass + " inline-flex items-center"
							}
							aria-hidden
						>
							<span
								className={
									dotSizeClass +
									" inline-block rounded-full bg-current opacity-30 animate-pulse"
								}
							/>
							<span
								className={
									dotSizeClass +
									" inline-block rounded-full bg-current opacity-30 animate-pulse"
								}
							/>
							<span
								className={
									dotLastClass +
									" inline-block rounded-full bg-current opacity-30 animate-pulse"
								}
							/>
						</span>
					</h2>

					{training ? (
						<div className="mt-3 flex justify-center">
							<button
								onClick={onQuitTraining ?? onQuit}
								className="px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors"
							>
								Quitter l'entraînement
							</button>
						</div>
					) : (
						<>
							<div className="mb-6">
								<p className="mt-2 text-sm text-white/80">
									Vous pouvez quitter ou lancer un
									entraînement
								</p>
							</div>

							<div className="space-y-4">
								<fieldset className="flex gap-4 justify-center items-center">
									<legend className="sr-only">
										Sélectionnez la difficulté
									</legend>
									<label className="inline-flex items-center space-x-2">
										<input
											type="radio"
											name="difficulty"
											value="easy"
											checked={difficulty === "easy"}
											onChange={() =>
												setDifficulty("easy")
											}
										/>
										<span>Facile</span>
									</label>
									<label className="inline-flex items-center space-x-2">
										<input
											type="radio"
											name="difficulty"
											value="medium"
											checked={difficulty === "medium"}
											onChange={() =>
												setDifficulty("medium")
											}
										/>
										<span>Moyen</span>
									</label>
									<label className="inline-flex items-center space-x-2">
										<input
											type="radio"
											name="difficulty"
											value="hard"
											checked={difficulty === "hard"}
											onChange={() =>
												setDifficulty("hard")
											}
										/>
										<span>Difficile</span>
									</label>
								</fieldset>

								<div className="flex gap-4 justify-center">
									<button
										type="button"
										onClick={onQuit}
										className="rounded-lg border transition-all duration-200 font-medium py-2.5 px-4 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
									>
										Quitter
										<div className="text-xs text-slate-500">
											Retour au menu
										</div>
									</button>

									<button
										type="button"
										onClick={handleTrain}
										className="rounded-lg border transition-all duration-200 font-medium py-2.5 px-4 border-emerald-400 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-700/25"
									>
										S'entraîner
										<div className="text-xs text-emerald-300">
											Jouer contre un bot
										</div>
									</button>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

