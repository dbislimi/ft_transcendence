import { useTranslation } from "react-i18next";

type PongScoreboardProps = {
	selfLabel: string;
	opponentLabel: string;
};

export default function PongScoreboard({
	selfLabel,
	opponentLabel,
}: PongScoreboardProps) {
	const { t } = useTranslation();
	return (
		<div className="absolute -top-10 left-0 right-0 flex justify-between text-xs sm:text-sm font-semibold px-2">
			<div className="flex items-center gap-2">
				<div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] text-white">
					{t("pong.scoreboard.p1")}
				</div>
				<span className="text-cyan-300">{selfLabel}</span>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-pink-300">{opponentLabel}</span>
				<div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-[10px] text-white">
					{t("pong.scoreboard.p2")}
				</div>
			</div>
		</div>
	);
}