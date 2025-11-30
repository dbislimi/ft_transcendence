import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

type Difficulty = "easy" | "medium" | "hard";

type Props = {
	onQuit: () => void;
	onTrain: (difficulty: Difficulty) => void;
	training?: boolean;
	onQuitTraining?: () => void;
};

export default function SearchingOverlay({
	onQuit,
	onTrain,
	training = false,
	onQuitTraining,
}: Props) {
	const { t } = useTranslation();
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
						{t("overlay.waiting.title")}
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
								{t("overlay.waiting.quitTrainingButton")}
							</button>
						</div>
					) : (
						<>
							<div className="mb-6">
								<p className="mt-2 text-sm text-white/80">
									{t("overlay.waiting.subtitle")}
								</p>
							</div>

							<div className="space-y-4">
								<fieldset className="flex gap-4 justify-center items-center">
									<legend className="sr-only">
										{t("overlay.waiting.selectDifficulty")}
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
										<span>{t("overlay.waiting.easy")}</span>
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
										<span>{t("overlay.waiting.medium")}</span>
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
										<span>{t("overlay.waiting.hard")}</span>
									</label>
								</fieldset>

								<div className="flex gap-4 justify-center">
									<button
										type="button"
										onClick={onQuit}
										className="rounded-lg border transition-all duration-200 font-medium py-2.5 px-4 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
									>
										{t("overlay.waiting.quitButton")}
										<div className="text-xs text-slate-500">
											{t("overlay.waiting.quitSubtitle")}
										</div>
									</button>

									<button
										type="button"
										onClick={handleTrain}
										className="rounded-lg border transition-all duration-200 font-medium py-2.5 px-4 border-emerald-400 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-700/25"
									>
										{t("overlay.waiting.trainButton")}
										<div className="text-xs text-emerald-300">
											{t("overlay.waiting.trainSubtitle")}
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
