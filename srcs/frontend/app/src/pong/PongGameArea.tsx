import type { MutableRefObject } from "react";
import PongCanvas from "../pong/PongCanvas";
import PongLabels from "../pong/PongLabels";
import type { PongState } from "../types/PongState";

type PongGameAreaProps = {
	labels: {
		self: string;
		opponent: string;
	};
	gameRef: MutableRefObject<PongState>;
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
			<PongCanvas
				gameRef={gameRef}
				me={
					side === 0
						? gameRef.current.players.p1
						: gameRef.current.players.p2
				}
			/>
		</div>
	);
}
