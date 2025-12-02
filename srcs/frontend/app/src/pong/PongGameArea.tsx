import type { MutableRefObject } from "react";
import PongCanvas from "../pong/PongCanvas";
import PongLabels from "../pong/PongLabels";
import type { GameState } from "../types/GameState";

type PongGameAreaProps = {
	labels: {
		self: string;
		opponent: string;
	};
	gameRef: MutableRefObject<GameState>;
	side: 0 | 1;
};

export default function PongGameArea({
	labels,
	gameRef,
	side,
}: PongGameAreaProps) {
	return (
		<div className="relative">
			<PongLabels
				selfLabel={labels.self}
				opponentLabel={labels.opponent}
				side={side}
			/>
			<PongCanvas gameRef={gameRef} />
		</div>
	);
}
