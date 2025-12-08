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

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
			{!training && <div className="absolute inset-0 bg-black/40" />}

			<div className={`relative z-10 w-full max-w-xl mx-4 pointer-events-auto transition-all duration-300 ${training ? "-translate-y-48 mt-6" : ""}`}>
				<div className={`bg-black/50 backdrop-blur-sm ${training ? "px-4 py-3" : "px-6 py-4"} rounded-lg border border-white/20 shadow-lg shadow-white/8 text-center`}>
					<h2 className={`${training ? "text-lg" : "text-2xl"} font-semibold text-white inline-flex items-center justify-center`}>
						{t("pong.searching.waitingOpponent")}
						<span className={`${training ? "ml-2" : "ml-3"} inline-flex items-center gap-1`}>
							<span className={`${training ? "w-1.5 h-1.5" : "w-2 h-2"} rounded-full bg-white opacity-30 animate-pulse`} />
							<span className={`${training ? "w-1.5 h-1.5" : "w-2 h-2"} rounded-full bg-white opacity-30 animate-pulse`} style={{ animationDelay: "0.2s" }} />
							<span className={`${training ? "w-1.5 h-1.5" : "w-2 h-2"} rounded-full bg-white opacity-30 animate-pulse`} style={{ animationDelay: "0.4s" }} />
						</span>
					</h2>

					{training ? (
						<div className="mt-3 flex justify-center">
							<button
								onClick={onQuitTraining ?? onQuit}
								className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10"
							>
								{t("pong.searching.quitTraining")}
							</button>
						</div>
					) : (
						<>
							<div className="mt-4 mb-6">
								<p className="text-sm text-white/70">
									{t("pong.searching.quitOrTrain")}
								</p>
							</div>

							<div className="space-y-4">
								<fieldset className="flex gap-4 justify-center items-center">
									<legend className="sr-only">
										{t("pong.searching.selectDifficulty")}
									</legend>
									<label className="inline-flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="difficulty"
											value="easy"
											checked={difficulty === "easy"}
											onChange={() => setDifficulty("easy")}
											className="cursor-pointer"
										/>
										<span className="text-white/90 text-sm font-medium">{t("pong.searching.easy")}</span>
									</label>
									<label className="inline-flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="difficulty"
											value="medium"
											checked={difficulty === "medium"}
											onChange={() => setDifficulty("medium")}
											className="cursor-pointer"
										/>
										<span className="text-white/90 text-sm font-medium">{t("pong.searching.medium")}</span>
									</label>
									<label className="inline-flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											name="difficulty"
											value="hard"
											checked={difficulty === "hard"}
											onChange={() => setDifficulty("hard")}
											className="cursor-pointer"
										/>
										<span className="text-white/90 text-sm font-medium">{t("pong.searching.hard")}</span>
									</label>
								</fieldset>

								<div className="flex gap-3 justify-center">
									<button
										type="button"
										onClick={onQuit}
										className="px-4 py-2 rounded-lg bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all border border-white/10 text-sm font-medium"
									>
										{t("pong.searching.quit")}
										<div className="text-xs text-white/50 mt-0.5">
											{t("pong.searching.backToMenu")}
										</div>
									</button>

									<button
										type="button"
										onClick={handleTrain}
										className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all border border-emerald-500/30 text-sm font-medium"
									>
										{t("pong.searching.train")}
										<div className="text-xs text-emerald-300/80 mt-0.5">
											{t("pong.searching.vsBot")}
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