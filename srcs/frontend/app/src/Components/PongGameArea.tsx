import type { MutableRefObject } from "react";
import PongCanvas from "./PongCanvas";
import PongScoreboard from "./PongScoreboard";
import type { GameState } from "../types/GameState";

type PongGameAreaProps = {
	labels: {
		self: string;
		opponent: string;
	};
	gameRef: MutableRefObject<GameState>;
	scale: number;
};

export default function PongGameArea({
	labels,
	gameRef,
	scale,
}: PongGameAreaProps) {
	return (
		<div className="relative">
			<PongScoreboard
				selfLabel={labels.self}
				opponentLabel={labels.opponent}
			/>
			<PongCanvas gameRef={gameRef} scale={scale} />
		</div>
	);
}

