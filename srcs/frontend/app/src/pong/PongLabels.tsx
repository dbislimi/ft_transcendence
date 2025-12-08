import { useRef } from "react";

type PongScoreboardProps = {
	selfLabel: string;
	opponentLabel: string;
	side: 0 | 1;
};

export default function PongLabels({
	selfLabel,
	opponentLabel,
	side,
}: PongScoreboardProps) {
	const selfOnLeft = side === 0;
	const playerPaddle = side === 0 ? "P1" : "P2";
	const opponentPaddle = side === 0 ? "P2" : "P1";

	return (
		<div className="absolute -top-10 left-0 right-0 flex justify-between text-xs sm:text-sm font-semibold px-2">
			{selfOnLeft ? (
				<>
					<div className="flex items-center gap-2">
						<div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] text-white">
							{playerPaddle}
						</div>
						<span className="text-cyan-300">{selfLabel}</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-pink-300">{opponentLabel}</span>
						<div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-[10px] text-white">
							{opponentPaddle}
						</div>
					</div>
				</>
			) : (
				<>
					<div className="flex items-center gap-2">
						<div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-[10px] text-white">
							{opponentPaddle}
						</div>
						<span className="text-pink-300">{opponentLabel}</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-cyan-300">{selfLabel}</span>
						<div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] text-white">
							{playerPaddle}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
