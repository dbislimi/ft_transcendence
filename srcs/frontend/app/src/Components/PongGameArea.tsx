import type { MutableRefObject } from "react";
import PongCanvas from "../pong/PongCanvas";
import PongScoreboard from "./PongScoreboard";
import type { PongState } from "../types/PongState";

type PongGameAreaProps = {
	labels: {
		self: string;
		opponent: string;
	};
	gameRef: MutableRefObject<PongState>;
	side: 0 | 1;
	me?: any;
};

export default function PongGameArea({
	labels,
	gameRef,
	side,
	me,
}: PongGameAreaProps) {
	return (
		<div className="relative">
			<PongScoreboard
				selfLabel={labels.self}
				opponentLabel={labels.opponent}
			/>
			<PongCanvas
				gameRef={gameRef}
				me={
					me ||
					(side === 0
						? gameRef.current.players.p1
						: gameRef.current.players.p2)
				}
			/>
		</div>
	);
}
