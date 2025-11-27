import type { MutableRefObject } from "react";
import PongCanvas from "../pong/PongCanvas";
import PongScoreboard from "./PongScoreboard";
import type { GameState } from "../types/GameState";

type PongGameAreaProps = {
	labels: {
		self: string;
		opponent: string;
	};
	gameRef: MutableRefObject<GameState>;
	scale: number;
	cosmetics: {
		preferredSide: string;
		paddleColor: string;
		ballColor: string;
	};
	side: number | null;
	opponentPaddleColor?: string;
};

export default function PongGameArea({
	labels,
	gameRef,
	scale,
	cosmetics,
	side,
	opponentPaddleColor,
}: PongGameAreaProps) {
	return (
		<div className="relative">
			<PongScoreboard
				selfLabel={labels.self}
				opponentLabel={labels.opponent}
			/>
			<PongCanvas
				gameRef={gameRef}
				scale={scale}
				cosmetics={cosmetics}
				side={side}
				opponentPaddleColor={opponentPaddleColor}
			/>
		</div>
	);
}

