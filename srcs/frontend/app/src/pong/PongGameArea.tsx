import type { MutableRefObject } from "react";
import PongCanvas from "./PongCanvas";
import PongLabels from "./PongLabels";
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
	opponentPaddleColor?: string;
	side: number | null;
};

export default function PongGameArea({
	labels,
	gameRef,
	scale,
	cosmetics,
	opponentPaddleColor,
	side,
}: PongGameAreaProps) {
	return (
		<div className="relative">
			<PongLabels
				selfLabel={labels.self}
				opponentLabel={labels.opponent}
				preferredSide={cosmetics.preferredSide}
				side={side}
			/>
			<PongCanvas
				gameRef={gameRef}
				scale={scale}
				cosmetics={cosmetics}
				opponentPaddleColor={opponentPaddleColor}
				side={side}
			/>
		</div>
	);
}
